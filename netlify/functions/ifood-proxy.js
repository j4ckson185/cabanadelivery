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
        const { endpoint, method = 'GET', body, headers = {} } = JSON.parse(event.body);
        
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
        
        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Cabana-Delivery/1.0',
                ...headers
            }
        };

        if (body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(fullUrl, fetchOptions);
        
        console.log(`Resposta: ${response.status} ${response.statusText}`);
        
        let responseData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        console.log('Dados da resposta:', responseData);

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
