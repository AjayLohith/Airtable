import axios from 'axios';

export async function refreshAccessToken(refreshToken) {
  const response = await axios.post('https://www.airtable.com/oauth2/v1/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.AIRTABLE_CLIENT_ID,
    client_secret: process.env.AIRTABLE_CLIENT_SECRET
  }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
}

export async function getAirtableRequest(accessToken, method, url, data = null) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    if (data) config.data = data;
    return await axios(config);
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw error;
  }
}

export async function getBases(accessToken) {
  const response = await getAirtableRequest(accessToken, 'get', 'https://api.airtable.com/v0/meta/bases');
  return response.data.bases;
}

export async function getTables(accessToken, baseId) {
  const response = await getAirtableRequest(accessToken, 'get', `https://api.airtable.com/v0/meta/bases/${baseId}/tables`);
  return response.data.tables;
}

export async function getFields(accessToken, baseId, tableId) {
  const response = await getAirtableRequest(accessToken, 'get', `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}`);
  return response.data.fields;
}

export async function createRecord(accessToken, baseId, tableId, fields) {
  const response = await getAirtableRequest(accessToken, 'post', 
    `https://api.airtable.com/v0/${baseId}/${tableId}`, 
    { fields }
  );
  return response.data;
}

const AIRTABLE_TYPE_MAP = {
  'singleLineText': 'singleLineText',
  'multilineText': 'longText',
  'singleSelect': 'singleSelect',
  'multipleSelects': 'multipleSelects',
  'multipleRecordLinks': 'multipleSelects',
  'attachment': 'attachments'
};

export function mapAirtableFieldType(airtableType) {
  return AIRTABLE_TYPE_MAP[airtableType] || null;
}

export function isSupportedFieldType(airtableType) {
  return mapAirtableFieldType(airtableType) !== null;
}


