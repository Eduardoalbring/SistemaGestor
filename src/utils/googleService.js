const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

class GoogleCalendarService {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.tokenPath = path.join(this.userDataPath, 'google_token.json');
    
    // IDs carregados do .env para segurança
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    // Porta fixa para o retorno local (usada para pegar o token de auth)
    this.redirectUri = 'http://localhost:3000/oauth2callback';
    
    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    this.loadToken();
  }

  loadToken() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const token = JSON.parse(fs.readFileSync(this.tokenPath));
        this.oauth2Client.setCredentials(token);
        return true;
      }
    } catch (err) {
      console.error('Erro ao ler token do Google:', err);
    }
    return false;
  }

  saveToken(token) {
    try {
      this.oauth2Client.setCredentials(token);
      fs.writeFileSync(this.tokenPath, JSON.stringify(token));
      return true;
    } catch (err) {
      console.error('Erro ao salvar token do Google:', err);
      return false;
    }
  }

  isAuthenticated() {
    return fs.existsSync(this.tokenPath);
  }

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Pede refresh_token para não pedir login toda hora
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent' // Garante que o refresh_token seja enviado
    });
  }

  async setTokensFromCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.saveToken(tokens);
    return tokens;
  }

  async logout() {
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }
    this.oauth2Client.setCredentials({});
  }

  // ================= CALENDAR METHODS =================
  get calendar() {
    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async listarEventosFuturos() {
    if (!this.isAuthenticated()) return [];
    
    try {
      const res = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      });
      return res.data.items || [];
    } catch (err) {
      console.error('The API returned an error:', err);
      throw err;
    }
  }

  async criarEvento(dados) {
    if (!this.isAuthenticated()) throw new Error('Not authenticated');

    const event = {
      summary: dados.titulo,
      description: dados.descricao || '',
      start: { dateTime: new Date(dados.data_inicio).toISOString() },
      end: { dateTime: new Date(dados.data_fim).toISOString() },
      colorId: this.mapColorToGoogle(dados.cor),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 }
        ],
      },
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      return response.data; // Retorna o ID gerado pelo Google
    } catch (err) {
      console.error('Erro ao criar evento GOOGLE:', err);
      throw err;
    }
  }

  async atualizarEvento(googleEventId, dados) {
    if (!this.isAuthenticated() || !googleEventId) return null;

    const event = {
      summary: dados.titulo,
      description: dados.descricao || '',
      start: { dateTime: new Date(dados.data_inicio).toISOString() },
      end: { dateTime: new Date(dados.data_fim).toISOString() },
      colorId: this.mapColorToGoogle(dados.cor),
    };

    try {
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        resource: event,
      });
      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar evento GOOGLE:', err);
      throw err;
    }
  }

  async excluirEvento(googleEventId) {
    if (!this.isAuthenticated() || !googleEventId) return;

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });
      return true;
    } catch (err) {
      console.error('Erro ao excluir evento GOOGLE:', err);
      throw err;
    }
  }

  // Google Calendar usa IDs numéricos (1 a 11) para as cores predefinidas
  mapColorToGoogle(hex) {
    const colorMap = {
      '#ef4444': '11',// Tomato/Red
      '#f97316': '6', // Tangerine/Orange 
      '#eab308': '5', // Banana/Yellow
      '#22c55e': '2', // Sage/Green
      '#3b82f6': '9', // Blueberry/Blue
      '#8b5cf6': '3', // Grape/Purple
      '#ec4899': '4', // Flamingo/Pink
      '#64748b': '8'  // Graphite/Gray
    };
    return colorMap[hex] || '9'; // Default Blue
  }
}

module.exports = GoogleCalendarService;
