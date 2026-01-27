/**
 * PKCE Helpers for Google OAuth
 */

// Generate a random string of length 64
export const generateCodeVerifier = () => {
    const array = new Uint8Array(64);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
};

// SHA-256 hash and base64url encode the verifier
export const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);

    // Base64Url encode
    const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return base64;
};
