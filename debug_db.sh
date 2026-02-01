#!/bin/bash
ANON_KEY=$(awk -F= '/VITE_SUPABASE_ANON_KEY/{print $2}' .env | tr -d '\r ' )
URL=$(awk -F= '/VITE_SUPABASE_URL/{print $2}' .env | tr -d '\r ' )
UID="106383530372309709030"

echo "--- user_accounts check ---"
curl -s -X GET "$URL/rest/v1/user_accounts?google_uid=eq.$UID" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

echo -e "\n\n--- sessions check ---"
curl -s -X GET "$URL/rest/v1/sessions?user_uid=eq.$UID&order=created_at.desc&limit=2" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"
