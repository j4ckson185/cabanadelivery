// netlify/functions/ifood-proxy.js
// Função proxy para API do iFood - versão completa corrigida

exports.handler = async (event, context) => {
    console.log('🚀 Função proxy chamada:', event.httpMethod);
    console.log('📍 Timestamp:', new Date().toISOString());
    
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
        console.log('❌ Método não permitido:', event.httpMethod);
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
        const endpoint = requestData.endpoint || requestData.path;
        const { method = 'GET', body, headers = {}, isAuth = false } = requestData;
        
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

        console.log(`🎯 URL FINAL CONSTRUÍDA: ${fullUrl}`);
        console.log(`🎯 ENDPOINT RECEBIDO: "${endpoint}"`);
        console.log(`🎯 BASE URL: ${baseUrl}`);
        console.log(`🔗 Fazendo requisição: ${method} ${fullUrl}`);
        
        const fetchOptions = {
            method,
            headers: {
                'User-Agent': 'Cabana-Delivery/1.0',
                'Accept': 'application/json',
                ...headers
            }
        };

        console.log('📋 Headers iniciais:', fetchOptions.headers);

        // Tratamento do body baseado no tipo de requisição
        if (body && method !== 'GET') {
            console.log('🔄 Processando body - isAuth:', isAuth, 'endpoint:', endpoint);
            console.log('🔄 Body original (tipo):', typeof body);
            console.log('🔄 Body original (preview):', String(body).substring(0, 100) + '...');
            
            if (isAuth === true) {
                // MODO SIMPLES: Para autenticação OAuth2 - usar o body exatamente como veio
                fetchOptions.body = body;
                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                console.log('✅ isAuth=true: Usando body exatamente como veio');
                console.log('✅ Content-Type definido como application/x-www-form-urlencoded');
            } else if (endpoint && endpoint.includes('authentication')) {
                // Fallback apenas se isAuth não for true
                console.log('⚠️ Fallback: isAuth não é true, processando manualmente para authentication');
                if (typeof body === 'string') {
                    // Se já é string URLSearchParams, usar direto
                    fetchOptions.body = body;
                } else if (typeof body === 'object') {
                    // Se é objeto, converter para URLSearchParams
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
                // Para outras requisições - JSON
                fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                fetchOptions.headers['Content-Type'] = 'application/json';
                console.log('📄 Body JSON para outras requisições:', fetchOptions.body);
            }
        } else {
            console.log('⏭️ Nenhum body para processar (GET ou body vazio)');
        }

        // Log headers finais
        console.log('⚙️ Headers finais para iFood:', JSON.stringify(fetchOptions.headers, null, 2));
        console.log('⚙️ Método:', fetchOptions.method);
        console.log('⚙️ Body final:', fetchOptions.body);
        
        console.log('🚀 ENVIANDO REQUISIÇÃO PARA IFOOD...');
        const response = await fetch(fullUrl, fetchOptions);
        
        console.log(`📨 Resposta recebida: ${response.status} ${response.statusText}`);
        console.log('📨 Headers da resposta:', Object.fromEntries(response.headers.entries()));

        let responseData;
        
        // Tratar resposta 204 (No Content) - comum no polling quando não há eventos
        if (response.status === 204) {
            console.log('📭 Resposta 204: Nenhum conteúdo (sem novos eventos)');
            responseData = null;
        } else {
            // Para outras respostas, tentar parsear JSON
            const contentType = response.headers.get('content-type') || '';
            console.log('📄 Content-Type da resposta:', contentType);
            
            if (contentType.includes('application/json')) {
                try {
                    responseData = await response.json();
                    console.log('✅ JSON parseado com sucesso');
                } catch (jsonError) {
                    console.error('❌ Erro ao parsear JSON da resposta:', jsonError);
                    const textData = await response.text();
                    console.log('📝 Resposta como texto:', textData);
                    responseData = { error: 'Resposta não é JSON válido', rawData: textData };
                }
            } else {
                const textData = await response.text();
                console.log('📝 Resposta não-JSON recebida:', textData.substring(0, 200) + '...');
                
                if (textData.trim()) {
                    try {
                        responseData = JSON.parse(textData);
                        console.log('✅ Texto parseado como JSON com sucesso');
                    } catch (parseError) {
                        console.log('📝 Texto não é JSON, mantendo como string');
                        responseData = { data: textData, rawResponse: true };
                    }
                } else {
                    console.log('📭 Resposta vazia');
                    responseData = null;
                }
            }
        }

        console.log('✅ Dados da resposta processados (preview):', 
            responseData ? JSON.stringify(responseData).substring(0, 200) + '...' : 'null');

        // Headers CORS padronizados
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Content-Type': 'application/json'
        };

        if (!response.ok) {
            console.log(`⚠️ Resposta não-OK (${response.status}), retornando erro estruturado`);
            console.log('🔍 Detalhes do erro:', responseData);
            
            return {
                statusCode: response.status,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: responseData?.error || responseData?.message || `HTTP ${response.status}`,
                    details: responseData,
                    status: response.status,
                    url: fullUrl,
                    method: method
                })
            };
        }

        console.log('✅ Retornando resposta de sucesso');
        return {
            statusCode: response.status,
            headers: corsHeaders,
            body: responseData ? JSON.stringify(responseData) : ''  // Para 204, retornar body vazio
        };

    } catch (error) {
        console.error('❌ Erro geral no proxy:', error);
        console.error('🔍 Stack trace:', error.stack);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Erro interno do servidor',
                message: error.message,
                details: error.toString(),
                timestamp: new Date().toISOString()
            })
        };
    }
};
