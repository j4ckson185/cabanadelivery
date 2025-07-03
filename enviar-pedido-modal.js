// ====================================
// MODAL ASSIGNMENT ADDON v1.0
// ====================================
// Arquivo para adicionar funcionalidade de atribuição de pedidos via modal
// Adicione este script no final do index.html, antes do fechamento do </body>

// ✅ NOVA VARIÁVEL GLOBAL
window.singleOrderForAssignment = null;

// ✅ SUBSTITUIR A FUNÇÃO generateActionButtons() EXISTENTE
window.generateActionButtons = function(order) {
    const status = order.orderStatus || 'PLACED';
    const assignment = deliveryAssignments.get(order.id);
    let buttons = '';

    console.log(`🔧 Gerando botões do MODAL para pedido ${order.displayId} com status: ${status}`);

    switch (status) {
        case 'PLACED':
        case 'PLC':
            buttons = `
                <div class="action-buttons">
                    <button class="btn btn-confirm" onclick="confirmOrder('${order.id}')">
                        ✅ Confirmar Pedido
                    </button>
                    <button class="btn btn-cancel" onclick="cancelOrder('${order.id}')">
                        ❌ Cancelar Pedido
                    </button>
                </div>
            `;
            break;
        case 'CONFIRMED':
        case 'CFM':
        case 'DDCR':
        case 'DDCS':
        case 'CARF':
            buttons = `
                <div class="action-buttons">
                    <button class="btn btn-dispatch" onclick="dispatchOrder('${order.id}')">
                        🚀 Despachar Pedido
                    </button>
                    ${!assignment ? `
                    <button class="btn" style="background: #10b981; color: white;" onclick="openSingleOrderDeliveryModal('${order.id}')">
                        🏍️ Atribuir para Motoboy
                    </button>
                    ` : `
                    <button class="btn" style="background: #8b5cf6; color: white;" onclick="showAssignmentInfo('${order.id}')">
                        👁️ Ver Atribuição
                    </button>
                    `}
                    <button class="btn btn-cancel" onclick="cancelOrder('${order.id}')">
                        ❌ Cancelar Pedido
                    </button>
                </div>
            `;
            break;
        case 'DISPATCHED':
        case 'DSP':
            buttons = `
                <div class="action-buttons">
                    ${assignment ? `
                    <button class="btn" style="background: #8b5cf6; color: white;" onclick="showAssignmentInfo('${order.id}')">
                        👁️ Ver Atribuição
                    </button>
                    ` : ''}
                    <button class="btn btn-cancel" onclick="cancelOrder('${order.id}')">
                        ❌ Cancelar Pedido
                    </button>
                </div>
            `;
            break;
        case 'CONCLUDED':
        case 'CON':
        case 'CANCELLED': 
        case 'CAN':
            buttons = '';
            break;
        default:
            buttons = `
                <div class="action-buttons">
                    <button class="btn btn-confirm" onclick="confirmOrder('${order.id}')">
                        ✅ Confirmar Pedido
                    </button>
                    <button class="btn btn-cancel" onclick="cancelOrder('${order.id}')">
                        ❌ Cancelar Pedido
                    </button>
                </div>
            `;
            break;
    }

    console.log(`🔧 Botões do MODAL gerados: ${buttons ? 'Sim' : 'Nenhum'}`);
    return buttons;
};

// ✅ NOVA FUNÇÃO: Abrir modal de seleção para pedido único
window.openSingleOrderDeliveryModal = function(orderId) {
    const order = orders.get(orderId);
    if (!order) {
        showToast('Pedido não encontrado', 'error');
        return;
    }

    console.log(`🏍️ Abrindo modal de atribuição para pedido único: ${order.displayId}`);
    
    // Armazenar pedido único
    window.singleOrderForAssignment = orderId;
    
    // Fechar modal do pedido primeiro
    closeModal();
    
    // Configurar o modal para pedido único
    document.getElementById('selectedOrdersCount').textContent = '1';
    
    // Atualizar status dos entregadores
    updateDeliveryStatuses();
    
    // Mostrar modal
    document.getElementById('deliverySelectionModal').style.display = 'block';
};

// ✅ NOVA FUNÇÃO: Mostrar informações da atribuição
window.showAssignmentInfo = function(orderId) {
    const order = orders.get(orderId);
    const assignment = deliveryAssignments.get(orderId);
    
    if (!order || !assignment) {
        showToast('Informações não encontradas', 'error');
        return;
    }
    
    console.log(`👁️ Mostrando info da atribuição para pedido ${order.displayId}`);
    
    const assignedTime = assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleString('pt-BR') : 'N/A';
    const acceptedTime = assignment.acceptedAt ? new Date(assignment.acceptedAt).toLocaleString('pt-BR') : 'Não aceito';
    const dispatchedTime = assignment.dispatchedAt ? new Date(assignment.dispatchedAt).toLocaleString('pt-BR') : 'Não despachado';
    const concludedTime = assignment.concludedAt ? new Date(assignment.concludedAt).toLocaleString('pt-BR') : 'Não concluído';
    
    const statusLabels = {
        'sent': '📤 Enviado',
        'accepted': '✅ Aceito',
        'dispatched': '🚀 Despachado',
        'concluded': '🎯 Concluído'
    };
    
    // Criar modal de informações
    const infoModal = document.createElement('div');
    infoModal.className = 'modal';
    infoModal.style.display = 'block';
    infoModal.id = 'assignmentInfoModal';
    
    infoModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #10b981, #059669);">
                <div class="modal-title">🏍️ Informações da Atribuição</div>
                <div class="modal-subtitle">Pedido #${order.displayId}</div>
                <button class="close-btn" onclick="closeAssignmentInfoModal()">×</button>
            </div>
            <div class="modal-body">
                <div style="display: grid; gap: 1rem;">
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
                        <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">📦 Pedido</div>
                        <div style="font-size: 0.875rem; color: #64748b;">Cliente: ${order.customer?.name || 'N/A'}</div>
                        <div style="font-size: 0.875rem; color: #64748b;">Total: ${formatCurrency(order.total?.orderAmount || 0)}</div>
                    </div>
                    
                    <div style="background: #f0fdf4; padding: 1rem; border-radius: 8px;">
                        <div style="font-weight: 600; color: #166534; margin-bottom: 0.5rem;">🏍️ Entregador</div>
                        <div style="font-size: 0.875rem; color: #166534;">Nome: ${assignment.deliveryName}</div>
                        <div style="font-size: 0.875rem; color: #166534;">Status: ${statusLabels[assignment.status] || assignment.status}</div>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 1rem; border-radius: 8px;">
                        <div style="font-weight: 600; color: #92400e; margin-bottom: 0.5rem;">⏱️ Cronologia</div>
                        <div style="font-size: 0.875rem; color: #92400e; margin-bottom: 0.25rem;">📤 Enviado: ${assignedTime}</div>
                        <div style="font-size: 0.875rem; color: #92400e; margin-bottom: 0.25rem;">✅ Aceito: ${acceptedTime}</div>
                        <div style="font-size: 0.875rem; color: #92400e; margin-bottom: 0.25rem;">🚀 Despachado: ${dispatchedTime}</div>
                        <div style="font-size: 0.875rem; color: #92400e;">🎯 Concluído: ${concludedTime}</div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                    <button onclick="removeSingleOrderFromDelivery('${orderId}')" 
                            style="flex: 1; padding: 0.75rem; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        🗑️ Remover do Motoboy
                    </button>
                    <button onclick="closeAssignmentInfoModal()" 
                            style="flex: 1; padding: 0.75rem; background: #6b7280; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(infoModal);
};

// ✅ NOVA FUNÇÃO: Fechar modal de informações da atribuição
window.closeAssignmentInfoModal = function() {
    const modal = document.getElementById('assignmentInfoModal');
    if (modal) {
        modal.remove();
        console.log('❌ Modal de informações da atribuição fechado');
    }
};

// ✅ NOVA FUNÇÃO: Remover pedido único do motoboy
window.removeSingleOrderFromDelivery = async function(orderId) {
    const order = orders.get(orderId);
    const assignment = deliveryAssignments.get(orderId);
    
    if (!order || !assignment) {
        showToast('Pedido ou atribuição não encontrada', 'error');
        return;
    }

    const confirmed = confirm(`Remover pedido #${order.displayId} do motoboy ${assignment.deliveryName}?`);
    if (!confirmed) return;

    try {
        console.log(`🗑️ Removendo assignment do pedido ${orderId}`);
        
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(window.firebaseDb, 'deliveryAssignments', orderId);
        await deleteDoc(docRef);
        
        deliveryAssignments.delete(orderId);
        
        closeAssignmentInfoModal();
        showToast(`✅ Pedido #${order.displayId} removido do motoboy`, 'success');
        
        // Atualizar UI
        applyFilters();
        renderOrders();
        
    } catch (error) {
        console.error('❌ Erro ao remover assignment:', error);
        showToast('Erro ao remover pedido do motoboy', 'error');
    }
};

// ✅ SUBSTITUIR A FUNÇÃO assignToDelivery() EXISTENTE
window.assignToDelivery = async function(deliveryId, deliveryName) {
    try {
        let orderIds = [];
        
        // Verificar se é atribuição de pedido único ou múltiplos
        if (window.singleOrderForAssignment) {
            orderIds = [window.singleOrderForAssignment];
            console.log(`📤 Atribuindo pedido único ${window.singleOrderForAssignment} para ${deliveryName}`);
        } else {
            orderIds = Array.from(selectedOrders);
            console.log(`📤 Atribuindo ${selectedOrders.size} pedidos para ${deliveryName}`);
        }
        
        if (orderIds.length === 0) {
            showToast('Nenhum pedido selecionado', 'error');
            return;
        }
        
        // Salvar atribuições localmente
        orderIds.forEach(orderId => {
            deliveryAssignments.set(orderId, {
                deliveryId,
                deliveryName,
                status: 'sent',
                assignedAt: new Date().toISOString()
            });
        });
        
        // Salvar no Firebase
        await saveDeliveryAssignments(orderIds, deliveryId, deliveryName);
        
        // Limpar seleções
        selectedOrders.clear();
        window.singleOrderForAssignment = null;
        updateSendButton();
        
        // Fechar modais
        closeDeliverySelectionModal();
        
        // Atualizar UI
        applyFilters();
        renderOrders();
        
        if (deliveryMap) {
            loadMapOrders();
        }
        
        showToast(`✅ ${orderIds.length} pedido(s) enviado(s) para ${deliveryName}`, 'success');
        
    } catch (error) {
        console.error('Erro ao atribuir pedidos:', error);
        showToast('Erro ao enviar pedidos', 'error');
    }
};

// ✅ SUBSTITUIR A FUNÇÃO closeDeliverySelectionModal() EXISTENTE
window.closeDeliverySelectionModal = function() {
    document.getElementById('deliverySelectionModal').style.display = 'none';
    
    // Limpar pedido único se existir
    window.singleOrderForAssignment = null;
    
    console.log('❌ Modal de seleção de entregador fechado');
};

// ✅ ADICIONAR RAFAEL JUDSON AO MODAL (caso não tenha sido adicionado ainda)
// Esta função adiciona o Rafael automaticamente se não estiver presente
function addRafaelToDeliveryModal() {
    const deliveryList = document.querySelector('.delivery-list');
    if (!deliveryList) return;
    
    // Verificar se Rafael já existe
    const existingRafael = Array.from(deliveryList.children).find(option => 
        option.textContent.includes('Rafael') || option.textContent.includes('rafaeljudson')
    );
    
    if (!existingRafael) {
        console.log('📋 Adicionando Rafael Judson ao modal de entregadores');
        
        const rafaelOption = document.createElement('div');
        rafaelOption.className = 'delivery-option';
        rafaelOption.onclick = () => assignToDelivery('rafael', 'Rafael Judson');
        rafaelOption.innerHTML = `
            <div class="delivery-name">🏍️ Rafael Judson</div>
            <div class="delivery-email">rafaeljudson.profissional@gmail.com</div>
        `;
        
        // Adicionar antes do último item (Rivanilson)
        const lastOption = deliveryList.lastElementChild;
        if (lastOption) {
            deliveryList.insertBefore(rafaelOption, lastOption);
        } else {
            deliveryList.appendChild(rafaelOption);
        }
        
        console.log('✅ Rafael Judson adicionado ao modal');
    }
}

// ✅ EXECUTAR AUTOMATICAMENTE QUANDO O SCRIPT FOR CARREGADO
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Modal Assignment Addon carregado');
    
    // Adicionar Rafael ao modal se não existir
    setTimeout(() => {
        addRafaelToDeliveryModal();
    }, 1000);
});

// ✅ ADICIONAR FUNCIONALIDADES GLOBAIS
window.openSingleOrderDeliveryModal = window.openSingleOrderDeliveryModal;
window.showAssignmentInfo = window.showAssignmentInfo;
window.closeAssignmentInfoModal = window.closeAssignmentInfoModal;
window.removeSingleOrderFromDelivery = window.removeSingleOrderFromDelivery;

console.log('✅ Modal Assignment Addon v1.0 carregado com sucesso!');
