export const WHATSAPP_TEMPLATES = {
    new_quote: "Olá {customerName}! 😃\n\nSegue o link do seu orçamento *#{quoteId}* para conferência: \n{link}\n\nFicamos no aguardo!",

    follow_up: "Olá {customerName}, tudo bem? 👀\n\nConseguiu dar uma olhada no orçamento *#{quoteId}*? \nSegue o link para aprovação rápida: {link}\n\nPodemos fechar ou tem alguma dúvida?",

    approved: "Oba! O orçamento *#{quoteId}* foi aprovado! 🚀\nEstamos iniciando a produção. Muito obrigado!",

    payment_pixel: "Olá {customerName}! \nPara agilizar a produção do pedido *#{quoteId}*, segue chave Pix:\n\n🔑 *CHAVE PIX AQUI*\n\nValor: R$ {total}\n\nAssim que fizer, me manda o comprovante? 😉",

    monitor_pending: "Oi {customerName}, notei que o orçamento *#{quoteId}* vence em breve. \nQuer garantir esse preço?",

    follow_up_stale: "Olá {customerName}! 👋\n\nVi que seu orçamento *#{quoteId}* ainda está pendente. \nFicou alguma dúvida sobre os valores ou materiais? \n\nPosso te ajudar a ajustar algo para fecharmos? 🚀",

    post_sales: "Olá {customerName}, tudo ótimo? ✨\n\nJá faz alguns dias que entregamos seu pedido *#{quoteId}*. \nDeu tudo certo com o material? O resultado ficou como esperava? \n\nQualquer coisa, estou à disposição! 👊"
};

export const generateMessage = (templateKey: keyof typeof WHATSAPP_TEMPLATES, data: { customerName: string, quoteId: string, link: string, total?: string }): string => {
    let msg = WHATSAPP_TEMPLATES[templateKey];
    msg = msg.replace('{customerName}', data.customerName || 'Cliente');
    msg = msg.replace('{quoteId}', data.quoteId?.slice(-4) || '????');
    msg = msg.replace('{link}', data.link || '');
    msg = msg.replace('{total}', data.total || '0,00');
    return encodeURIComponent(msg);
};

// Track the window reference outside the function scope (singleton module)
let whatsappWindow: Window | null = null;

export const openWhatsApp = (phone: string, message: string) => {
    // Removed formatting to avoid errors if phone is malformed, assuming basic digits
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${message}`;

    // Check if window exists and is not closed
    if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.location.href = url;
        whatsappWindow.focus();
    } else {
        whatsappWindow = window.open(url, 'whatsapp-session');
    }
};
