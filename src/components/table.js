// ============ Table Component ============

const Table = {
  render(options) {
    const { columns, data, actions, emptyMessage, emptyIcon } = options;

    if (!data || data.length === 0) {
      return `
        <div class="table-empty">
          ${emptyIcon || Helpers.icons.fileText}
          <p>${emptyMessage || 'Nenhum registro encontrado'}</p>
          <span>Crie um novo registro para começar</span>
        </div>
      `;
    }

    return `
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.label}</th>`).join('')}
            ${actions ? '<th style="width: 120px;">Ações</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${columns.map(col => `<td>${col.render ? col.render(row) : (row[col.key] || '—')}</td>`).join('')}
              ${actions ? `<td class="table-actions">${actions(row)}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
};
