#!/bin/bash

generate_jwt () {
    jwt_header=$(echo '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')
    jwt_payload=$(echo $1 | base64 | tr -d '=' | tr '/+' '_-')
    hmac_signature=$(echo -n "${jwt_header}.${jwt_payload}" |  openssl dgst -sha256 -mac HMAC -macopt hexkey:$2 -binary | base64 | tr -d '=' | tr '/+' '_-')
    echo "${jwt_header}.${jwt_payload}.${hmac_signature}"
}

# secret=$(openssl rand -hex 32)
# secret_base64=$(echo "$secret" | tr -d '\n' | base64)

# iat=$(date +%s)
# exp=$((iat + 60 * 60 * 24 * 365 * 5))

# orig_anon_key_payload='{"role":"anon","iss":"supabase","iat":0,"exp":0}'
# anon_key_payload=$(echo "$orig_anon_key_payload" | jq --arg iat "$iat" --arg exp "$exp" '.iat = ($iat | tonumber) | .exp = ($exp | tonumber)')
# jwt_anon_key=$(generate_jwt "$anon_key_payload" "$secret")

# orig_service_key_payload='{"role":"service_role","iss":"supabase","iat":0,"exp":0}'
# service_key_payload=$(echo "$orig_service_key_payload" | jq --arg iat "$iat" --arg exp "$exp" '.iat = ($iat | tonumber) | .exp = ($exp | tonumber)')
# service_role_key=$(generate_jwt "$service_key_payload" "$secret")

echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)"
echo "ADMYRAL_SECRETS_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "ADMYRAL_WEBHOOK_SIGNING_SECRET=$(openssl rand -hex 32)"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
# echo "JWT_SECRET=$secret_base64"
# echo "ANON_KEY=$jwt_anon_key"
# echo "SERVICE_ROLE_KEY=$service_role_key"
# echo "DASHBOARD_PASSWORD=$(openssl rand -hex 32)"
