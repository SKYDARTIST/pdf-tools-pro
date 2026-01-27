# Deployment Notes

## Security Fixes Applied
- JWT signature verification (server-side)
- CSRF token protection
- PII masking in all logs
- Rate limiting: 10 req/min per device
- Session tokens: 1-hour expiry

## Known Limitations
- Pricing tiers UI not yet implemented (coming in Phase 2)
- GDPR data export/delete endpoints in progress
- Advanced analytics not yet enabled

## What Works
- Google Authentication (PKCE flow)
- PDF extraction (all formats)
- AI document analysis
- Device integrity verification
- Subscription tier (free trial)

## What to Monitor
- Auth error rates (should be < 1%)
- Rate limit hits (investigate if > 10/day)
- Database response times (target < 500ms)
- API error logs (alert on 500+ errors)
