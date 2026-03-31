// ============ PDF Export Utility ============

const PDFExport = {
  async generateOrcamento(orc) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- Configurações Iniciais ---
    const primaryColor = [30, 41, 59]; // Slate 800
    const accentColor = [14, 165, 233]; // Sky 500
    const textColor = [71, 85, 105]; // Slate 600
    const lightBg = [248, 250, 252]; // Slate 50
    const margin = 15;

    // --- Background Header ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 45, 'F');
    
    // Header Left (Logo/Nome)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text("SistemaGestor", margin, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text("Soluções Elétricas Profissionais", margin, 30);

    // Header Right (Info do Orçamento)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("ORÇAMENTO", 195 - margin, 22, { align: 'right' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`#${orc.id.toString().padStart(4, '0')}`, 195 - margin, 30, { align: 'right' });
    doc.text(`Data: ${Helpers.formatDate(orc.criado_em)}`, 195 - margin, 36, { align: 'right' });

    // --- Informações do Cliente & Serviço ---
    let currentY = 55;
    
    // Caixas de Informação
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, 85, 30, 2, 2, 'FD');
    doc.roundedRect(margin + 95, currentY, 85, 30, 2, 2, 'FD');

    // Box 1: Cliente
    doc.setFontSize(10);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", margin + 5, currentY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(orc.cliente_nome || "Cliente Não Informado", margin + 5, currentY + 14);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    if (orc.cliente_telefone) doc.text(`Telefone: ${orc.cliente_telefone}`, margin + 5, currentY + 20);
    if (orc.cliente_email) doc.text(`Email: ${orc.cliente_email}`, margin + 5, currentY + 26);

    // Box 2: Serviço
    doc.setFontSize(10);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMAÇÕES DO SERVIÇO", margin + 100, currentY + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(orc.titulo || "Serviço Padrão", margin + 100, currentY + 14);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    let descriptionLineCount = 0;
    if (orc.descricao) {
        const splitDesc = doc.splitTextToSize(orc.descricao, 75);
        // Proteje para não estourar a caixa
        const visibleDesc = splitDesc.slice(0, 3);
        if (splitDesc.length > 3) visibleDesc[2] += '...';
        doc.text(visibleDesc, margin + 100, currentY + 20);
        descriptionLineCount = visibleDesc.length;
    }

    currentY += 40;

    // --- Itens do Orçamento ---
    const body = (orc.itens || []).map(item => {
      // Se tem detalhes salvos, junta na descrição
      const descLine = item.detalhes ? `${item.descricao}\n  ↳ ${item.detalhes}` : item.descricao;
      return [
        descLine,
        item.quantidade.toString(),
        Helpers.formatCurrency(item.valor_unitario),
        item.comprado_pelo_cliente ? "(Fornecido p/ Cliente)" : Helpers.formatCurrency(item.quantidade * item.valor_unitario)
      ];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Descrição do Item', 'Quantidade', 'Valor Unitário', 'Total']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, cellPadding: 5, textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 35, fontStyle: 'bold', textColor: primaryColor }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 0) {
           data.cell.styles.fontStyle = (data.cell.raw.includes('\n')) ? 'normal' : 'bold';
        }
      }
    });

    // --- Resumo de Valores ---
    let finalY = doc.lastAutoTable.finalY + 15;
    
    if (finalY > 230) {
        doc.addPage();
        finalY = 30; // Mais margem se for parar na página 2
    }

    const totalItens = (orc.itens || [])
        .filter(i => !i.comprado_pelo_cliente)
        .reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
    const total = totalItens + (orc.mao_de_obra || 0) - (orc.desconto || 0);

    // Box do Totais
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(120, finalY - 5, 75, 40 + (orc.desconto > 0 ? 8 : 0), 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    doc.text("Total Materiais:", 125, finalY + 2);
    doc.text(Helpers.formatCurrency(totalItens), 190, finalY + 2, { align: 'right' });
    
    finalY += 8;
    doc.text("Mão de Obra:", 125, finalY + 2);
    doc.text(Helpers.formatCurrency(orc.mao_de_obra), 190, finalY + 2, { align: 'right' });
    
    if (orc.desconto > 0) {
        finalY += 8;
        doc.setTextColor(220, 38, 38);
        doc.text("Desconto Aplicado:", 125, finalY + 2);
        doc.text(`- ${Helpers.formatCurrency(orc.desconto)}`, 190, finalY + 2, { align: 'right' });
    }
    
    finalY += 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(125, finalY - 4, 190, finalY - 4); // linha acima do total

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("VALOR TOTAL:", 125, finalY + 3);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(Helpers.formatCurrency(total), 190, finalY + 3, { align: 'right' });

    // --- Área de Assinatura ---
    let signatureY = finalY + 35;
    if (signatureY > 260) {
      doc.addPage();
      signatureY = 40;
    }

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(30, signatureY, 100, signatureY);
    doc.line(110, signatureY, 180, signatureY);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Assinatura do Profissional", 65, signatureY + 5, { align: 'center' });
    doc.text("Assinatura do Cliente", 145, signatureY + 5, { align: 'center' });

    // --- Rodapé ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "italic");
        
        doc.text("Este orçamento é válido por 10 dias úteis e está sujeito à análise técnica e viabilidade.", 105, 285, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 195 - margin, 290, { align: 'right' });
    }

    // Salvar o arquivo
    const fileName = `Orcamento_${orc.id.toString().padStart(4, '0')}_${(orc.cliente_nome || "Cliente").replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  }
};
