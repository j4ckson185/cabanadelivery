// netlify/functions/ifood-proxy.js
// Salve este arquivo em: netlify/functions/ifood-proxy.js

exports.handler = async (event, context) => {
    // Apenas aceitar POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    try {
        const { endpoint, method = 'GET', body, headers = {}, isFormData = false } = JSON.parse(event.body);
        
        if (!endpoint) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Endpoint é obrigatório' })
            };
        }

        const baseUrl = 'https://merchant-api.ifood.com.br';
        const fullUrl = `${baseUrl}${endpoint}`;

        console.log(`Fazendo requisição: ${method} ${fullUrl}`);
        console.log('Headers:', headers);
        console.log('Body:', body);
        console.log('Is Form Data:', isFormData);
        
        const fetchOptions = {
            method,
            headers: {
                'User-Agent': 'Cabana-Delivery/1.0',
                ...headers
            }
        };

        if (body && method !== 'GET') {
            if (isFormData) {
                // Para OAuth2 padrão, usar application/x-www-form-urlencoded
                const params = new URLSearchParams();
                Object.keys(body).forEach(key => {
                    params.append(key, body[key]);
                });
                fetchOptions.body = params.toString();
                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            } else if (endpoint.includes('authentication')) {
                // iFood authentication: Usar URLSearchParams para garantir formato correto
                const params = new URLSearchParams();
                params.append('grantType', body.grantType || body.grant_type || 'client_credentials');
                params.append('clientId', body.clientId || body.client_id);
                params.append('clientSecret', body.clientSecret || body.client_secret);
                
                fetchOptions.body = params.toString();
                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                
                console.log('Body da autenticação:', fetchOptions.body);
            } else {
                // Para outras requisições, usar JSON padrão
                fetchOptions.body = JSON.stringify(body);
                fetchOptions.headers['Content-Type'] = 'application/json';
            }
        }

        const response = await fetch(fullUrl, fetchOptions);
        
        console.log(`Resposta: ${response.status} ${response.statusText}`);
        
        let responseData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            const textData = await response.text();
            // Tentar parsear como JSON se possível
            try {
                responseData = JSON.parse(textData);
            } catch {
                responseData = { data: textData };
            }
        }

        console.log('Dados da resposta:', responseData);

        // Se a resposta não é OK, mas tem dados de erro estruturados
        if (!response.ok && responseData) {
            return {
                statusCode: response.status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: responseData.error || responseData.message || `HTTP ${response.status}`,
                    details: responseData,
                    status: response.status
                })
            };
        }

        // Retornar resposta com headers CORS
        return {
            statusCode: response.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(responseData)
        };

    } catch (error) {
        console.error('Erro no proxy:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Erro interno do servidor',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
