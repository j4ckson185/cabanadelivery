// netlify/functions/ifood-proxy.js
// Função proxy para API do iFood - com logs detalhados

exports.handler = async (event, context) => {
    console.log('🚀 Função proxy chamada:', event.httpMethod);

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    // Apenas aceitar POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        console.log('📦 Event body recebido:', event.body);

        let requestData;
        try {
            requestData = JSON.parse(event.body || '{}');
        } catch (parseError) {
            console.error('❌ Erro ao parsear JSON:', parseError);
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'JSON inválido no body' })
            };
        }

        console.log('📋 Request data parseado:', JSON.stringify(requestData, null, 2));

        // Suporta tanto 'path' quanto 'endpoint' para compatibilidade total
        let endpoint = requestData.endpoint || requestData.path;
        const { method = 'GET', body, headers = {}, isAuth = false } = requestData;

        // 🔧 CORREÇÃO: transformar ":" em "/" no endpoint
        if (endpoint.includes(':')) {
            console.log('🔧 Corrigindo endpoint com dois-pontos:', endpoint);
            endpoint = endpoint.replace(/:/g, '/');
        }

        console.log('🔍 Valores extraídos:', {
            endpoint,
            method,
            hasBody: !!body,
            isAuth,
            bodyType: typeof body,
            headersCount: Object.keys(headers).length
        });

        if (!endpoint) {
            console.error('❌ Endpoint/Path não fornecido:', { requestData });
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Endpoint é obrigatório',
                    received: requestData
                })
            };
        }

        const baseUrl = 'https://merchant-api.ifood.com.br';
        const fullUrl = `${baseUrl}${endpoint}`;

        console.log(`🔗 Fazendo requisição: ${method} ${fullUrl}`);

        const fetchOptions = {
            method,
            headers: {
                'User-Agent': 'Cabana-Delivery/1.0',
                ...headers
            }
        };

        // Tratamento do body baseado no tipo de requisição
        if (body && method !== 'GET') {
            console.log('🔄 Processando body - isAuth:', isAuth, 'endpoint:', endpoint);
            console.log('🔄 Body original:', body);
            console.log('🔄 Tipo do body:', typeof body);

            if (isAuth === true) {
                // MODO SIMPLES: Para autenticação OAuth2 - usar o body exatamente como veio
                fetchOptions.body = body;
                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                console.log('✅ isAuth=true: Usando body exatamente como veio');
                console.log('✅ Final body para iFood:', fetchOptions.body);
            } else if (endpoint && endpoint.includes('authentication')) {
                // Fallback apenas se isAuth não for true
                console.log('⚠️ Fallback: isAuth não é true, processando manualmente');
                if (typeof body === 'string') {
                    fetchOptions.body = body;
                } else if (typeof body === 'object') {
                    const params = new URLSearchParams();
                    params.append('grantType', body.grantType || 'client_credentials');
                    params.append('clientId', body.clientId || '');
                    params.append('clientSecret', body.clientSecret || '');
                    fetchOptions.body = params.toString();
                } else {
                    fetchOptions.body = String(body);
                }
                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                console.log('⚠️ Fallback body final:', fetchOptions.body);
            } else {
                fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                fetchOptions.headers['Content-Type'] = 'application/json';
                console.log('📄 Body JSON para outras requisições:', fetchOptions.body);
            }
        } else {
            console.log('⏭️ Nenhum body para processar (GET ou body vazio)');
        }

        console.log('⚙️ Fetch options finais:', {
            method: fetchOptions.method,
            headers: fetchOptions.headers,
            bodyLength: fetchOptions.body ? fetchOptions.body.length : 0,
            bodyPreview: fetchOptions.body ? fetchOptions.body.substring(0, 100) + '...' : 'null'
        });

        console.log('🚀 ENVIANDO PARA IFOOD:');
        console.log('🎯 URL:', fullUrl);
        console.log('🎯 Method:', fetchOptions.method);
        console.log('🎯 Headers:', JSON.stringify(fetchOptions.headers, null, 2));
        console.log('🎯 Body completo:', fetchOptions.body);

        const response = await fetch(fullUrl, fetchOptions);

        console.log(`📨 Resposta recebida: ${response.status} ${response.statusText}`);

        let responseData;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            const textData = await response.text();
            try {
                responseData = JSON.parse(textData);
            } catch (parseError) {
                responseData = { data: textData, rawResponse: true };
            }
        }

        console.log('✅ Dados da resposta processados:', responseData);

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Content-Type': 'application/json'
        };

        if (!response.ok) {
            console.log(`⚠️ Resposta não-OK (${response.status}), retornando erro estruturado`);
            return {
                statusCode: response.status,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: responseData.error || responseData.message || `HTTP ${response.status}`,
                    details: responseData,
                    status: response.status
                })
            };
        }

        console.log('✅ Retornando resposta de sucesso');
        return {
            statusCode: response.status,
            headers: corsHeaders,
            body: JSON.stringify(responseData)
        };

    } catch (error) {
        console.error('❌ Erro geral no proxy:', error);

        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Erro interno do servidor',
                message: error.message,
                details: error.toString()
            })
        };
    }
};
