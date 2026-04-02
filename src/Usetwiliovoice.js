// useTwilioVoice.js
// Drop this hook alongside your BookingAssistant component.
// It manages the Twilio Device lifecycle and exposes a clean API.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || '/',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

/**
 * Call states mirroring Twilio's lifecycle:
 *   idle → connecting → ringing → in-call → ended → idle
 */
export const CALL_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',   // fetching token / registering device
  RINGING: 'ringing',         // outbound call placed, waiting for answer
  IN_CALL: 'in-call',         // call answered
  ENDED: 'ended',             // call finished (briefly shown before reset)
};

/**
 * useTwilioVoice({ business_slug, selectedService, sessionId })
 *
 * Returns:
 *   callState     – one of CALL_STATE values
 *   startCall()   – initiate outbound call
 *   endCall()     – hang up / cancel
 *   isMuted       – boolean
 *   toggleMute()  – mute/unmute mic
 *   callDuration  – seconds elapsed (updates every second while in-call)
 *   error         – string | null
 */
export function useTwilioVoice({ business_slug, selectedService, sessionId }) {
  const deviceRef = useRef(null);
  const callRef   = useRef(null);
  const timerRef  = useRef(null);

  const [callState, setCallState]     = useState(CALL_STATE.IDLE);
  const [isMuted, setIsMuted]         = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError]             = useState(null);

  // ── Clean up on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      deviceRef.current?.destroy();
    };
  }, []);

  // ── Duration timer ────────────────────────────────────────────────────
  const startTimer = () => {
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  };
  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // ── Register Twilio Device with a fresh access token ──────────────────
  const initDevice = useCallback(async () => {
    // Destroy any previous device before creating a new one
    if (deviceRef.current) {
      deviceRef.current.destroy();
      deviceRef.current = null;
    }

    // POST to your backend — adjust the payload to whatever your endpoint expects
    const res = await api.post('/api/v1/voice/twilio/', {
      business_slug,
      service_name: selectedService?.title,
      user_session_id: sessionId,
      action: 'token',          // hint to your backend to return an access token
    });

    // Support both { token } and { data: { token } } response shapes
    const token = res.data?.token ?? res.data?.data?.token;
    if (!token) throw new Error('No Twilio access token returned from server.');

    const device = new Device(token, {
      logLevel: 1,              // 0 = silent, 1 = errors only, 5 = verbose
      codecPreferences: ['opus', 'pcmu'],
      enableRingingState: true,
    });

    // ── Device event handlers ────────────────────────────────────────────
    device.on('registered', () => {
      console.log('[Twilio] Device registered');
    });

    device.on('error', (twilioError) => {
      console.error('[Twilio] Device error:', twilioError);
      setError(twilioError.message ?? 'Twilio device error');
      setCallState(CALL_STATE.IDLE);
      stopTimer();
    });

    device.on('tokenWillExpire', async () => {
      // Silently refresh the token so long calls don't drop
      try {
        const r = await api.post('/api/v1/voice/twilio/', {
          business_slug,
          service_name: selectedService?.title,
          user_session_id: sessionId,
          action: 'token',
        });
        const newToken = r.data?.token ?? r.data?.data?.token;
        if (newToken) device.updateToken(newToken);
      } catch (e) {
        console.warn('[Twilio] Token refresh failed:', e);
      }
    });

    await device.register();
    deviceRef.current = device;
    return device;
  }, [business_slug, selectedService, sessionId]);

  // ── Attach handlers to an active call object ───────────────────────────
  const attachCallHandlers = (call) => {
    callRef.current = call;

    call.on('ringing', () => setCallState(CALL_STATE.RINGING));

    call.on('accept', () => {
      setCallState(CALL_STATE.IN_CALL);
      setIsMuted(false);
      startTimer();
    });

    call.on('disconnect', () => {
      setCallState(CALL_STATE.ENDED);
      stopTimer();
      callRef.current = null;
      // Reset to idle after a short pause so the user sees "Call ended"
      setTimeout(() => setCallState(CALL_STATE.IDLE), 2000);
    });

    call.on('cancel', () => {
      setCallState(CALL_STATE.IDLE);
      stopTimer();
      callRef.current = null;
    });

    call.on('error', (err) => {
      console.error('[Twilio] Call error:', err);
      setError(err.message ?? 'Call error');
      setCallState(CALL_STATE.IDLE);
      stopTimer();
      callRef.current = null;
    });
  };

  // ── Public: start a call ───────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (callState !== CALL_STATE.IDLE) return;
    setError(null);
    setCallState(CALL_STATE.CONNECTING);

    try {
      const device = await initDevice();

      // Params forwarded to your TwiML app's Voice URL
      const call = await device.connect({
        params: {
          business_slug: business_slug ?? '',
          service_name: selectedService?.title ?? '',
          user_session_id: sessionId ?? '',
        },
      });

      attachCallHandlers(call);
    } catch (err) {
      console.error('[Twilio] startCall failed:', err);
      setError(err.message ?? 'Could not start call');
      setCallState(CALL_STATE.IDLE);
    }
  }, [callState, initDevice, business_slug, selectedService, sessionId]);

  // ── Public: end a call ────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (callRef.current) {
      callRef.current.disconnect();
    } else {
      deviceRef.current?.disconnectAll();
      setCallState(CALL_STATE.IDLE);
    }
    stopTimer();
  }, []);

  // ── Public: mute toggle ───────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!callRef.current) return;
    const next = !isMuted;
    callRef.current.mute(next);
    setIsMuted(next);
  }, [isMuted]);

  return { callState, startCall, endCall, isMuted, toggleMute, callDuration, error };
}