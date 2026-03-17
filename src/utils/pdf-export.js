// ============ PDF Export Utility ============

const PDFExport = {
  async generateOrcamento(orc) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configurações de cores e estilo
    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [37, 99, 235]; // Blue 600
    const textColor = [51, 65, 85]; // Slate 600

    // --- Cabeçalho ---
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Albring's", 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Gestão para Eletricistas", 20, 26);

    doc.setFontSize(16);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("ORÇAMENTO", 140, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`#${orc.id.toString().padStart(4, '0')}`, 140, 26);
    doc.text(`Data: ${Helpers.formatDate(orc.criado_em)}`, 140, 31);

    // Linha divisória
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 40, 190, 40);

    // --- Informações do Cliente ---
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", 20, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(orc.cliente_nome || "Não informado", 20, 56);
    if (orc.cliente_telefone) doc.text(`Tel: ${orc.cliente_telefone}`, 20, 61);
    if (orc.cliente_email) doc.text(`Email: ${orc.cliente_email}`, 20, 66);

    // --- Título e Descrição ---
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("SERVIÇO", 100, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(orc.titulo || "Não informado", 100, 56);
    
    let descriptionLineCount = 0;
    if (orc.descricao) {
        const splitDesc = doc.splitTextToSize(orc.descricao, 90);
        doc.text(splitDesc, 100, 61);
        descriptionLineCount = splitDesc.length;
    }

    // --- Itens do Orçamento ---
    const startY = Math.max(75, 61 + (descriptionLineCount * 5));

    const body = (orc.itens || []).map(item => [
      item.descricao,
      item.quantidade.toString(),
      Helpers.formatCurrency(item.valor_unitario),
      item.comprado_pelo_cliente ? "(Cliente)" : Helpers.formatCurrency(item.quantidade * item.valor_unitario)
    ]);

    doc.autoTable({
      startY: startY,
      head: [['Item', 'Qtd', 'V. Unit.', 'Total']],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    // --- Resumo de Valores ---
    let finalY = doc.lastAutoTable.finalY + 10;
    
    if (finalY > 250) {
        doc.addPage();
        finalY = 20;
    }

    const totalItens = (orc.itens || [])
        .filter(i => !i.comprado_pelo_cliente)
        .reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
    const total = totalItens + (orc.mao_de_obra || 0) - (orc.desconto || 0);

    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    doc.text("Subtotal Materiais:", 140, finalY);
    doc.text(Helpers.formatCurrency(totalItens), 190, finalY, { align: 'right' });
    
    finalY += 6;
    doc.text("Mão de Obra:", 140, finalY);
    doc.text(Helpers.formatCurrency(orc.mao_de_obra), 190, finalY, { align: 'right' });
    
    if (orc.desconto > 0) {
        finalY += 6;
        doc.setTextColor(220, 38, 38);
        doc.text("Desconto:", 140, finalY);
        doc.text(`- ${Helpers.formatCurrency(orc.desconto)}`, 190, finalY, { align: 'right' });
    }
    
    finalY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("TOTAL:", 140, finalY);
    doc.text(Helpers.formatCurrency(total), 190, finalY, { align: 'right' });

    // --- Rodapé ---
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "normal");
    const footerText = "Este é um orçamento preliminar sujeito a alterações. Válido por 10 dias.";
    doc.text(footerText, 105, 285, { align: 'center' });

    // Salvar o arquivo
    const fileName = `Orcamento_${orc.id}_${(orc.cliente_nome || "Cliente").replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  }
};
