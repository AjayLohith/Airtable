import express from 'express';
import { authenticate, getValidAccessToken } from '../middleware/auth.js';
import Form from '../models/Form.js';
import Response from '../models/Response.js';
import { getBases, getTables, getFields, createRecord, mapAirtableFieldType, isSupportedFieldType } from '../utils/airtable.js';
import { shouldShowQuestion } from '../utils/conditionalLogic.js';

const router = express.Router();

router.get('/forms/:formId', async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json({ form });
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

router.post('/forms/:formId/submit', async (req, res) => {
  try {
    const { formId } = req.params;
    const { answers } = req.body;

    const form = await Form.findById(formId).populate('ownerUserId');
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const owner = form.ownerUserId;
    const accessToken = await getValidAccessToken(owner);
    const fields = await getFields(accessToken, form.airtableBaseId, form.airtableTableId);
    const fieldMap = {};
    fields.forEach(f => { fieldMap[f.id] = f; });

    const airtableFields = {};
    const errors = [];

    for (const question of form.questions) {
      const shouldShow = shouldShowQuestion(question.conditionalRules, answers);
      if (!shouldShow) {
        continue;
      }

      const answer = answers[question.questionKey];
      const fieldDef = fieldMap[question.airtableFieldId];

      if (question.required && (answer === undefined || answer === null || answer === '' || 
          (Array.isArray(answer) && answer.length === 0))) {
        errors.push(`${question.label} is required`);
        continue;
      }

      if (answer !== undefined && answer !== null && answer !== '') {
        switch (question.type) {
          case 'singleSelect':
            if (fieldDef?.options?.choices) {
              const validChoices = fieldDef.options.choices.map(c => c.name || c);
              if (!validChoices.includes(answer)) {
                errors.push(`${question.label}: invalid choice`);
              } else {
                airtableFields[question.airtableFieldId] = answer;
              }
            } else {
              airtableFields[question.airtableFieldId] = answer;
            }
            break;

          case 'multipleSelects':
            if (!Array.isArray(answer)) {
              errors.push(`${question.label}: must be an array`);
            } else if (fieldDef?.options?.choices) {
              const validChoices = fieldDef.options.choices.map(c => c.name || c);
              const invalid = answer.filter(a => !validChoices.includes(a));
              if (invalid.length > 0) {
                errors.push(`${question.label}: invalid choices: ${invalid.join(', ')}`);
              } else {
                airtableFields[question.airtableFieldId] = answer;
              }
            } else {
              airtableFields[question.airtableFieldId] = answer;
            }
            break;

          case 'attachments':
            if (Array.isArray(answer)) {
              airtableFields[question.airtableFieldId] = answer.map(url => ({ url }));
            } else if (typeof answer === 'string') {
              airtableFields[question.airtableFieldId] = [{ url: answer }];
            } else {
              errors.push(`${question.label}: must be a URL or array of URLs`);
            }
            break;

          case 'singleLineText':
          case 'longText':
            airtableFields[question.airtableFieldId] = String(answer);
            break;

          default:
            errors.push(`Unsupported field type: ${question.type}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const airtableRecord = await createRecord(accessToken, form.airtableBaseId, form.airtableTableId, airtableFields);
    
    const response = await Response.create({
      formId: form._id,
      airtableRecordId: airtableRecord.id,
      answers,
      status: 'active'
    });

    res.status(201).json({ response });
  } catch (error) {
    console.error('Error submitting form:', error);
    if (error.message === 'TOKEN_EXPIRED') {
      return res.status(401).json({ error: 'Token expired, please refresh' });
    }
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

router.use(authenticate);

router.get('/me/bases', async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req.user);
    const bases = await getBases(accessToken);
    res.json({ bases });
  } catch (error) {
    console.error('Error fetching bases:', error);
    res.status(500).json({ error: 'Failed to fetch bases' });
  }
});

router.get('/me/bases/:baseId/tables', async (req, res) => {
  try {
    const { baseId } = req.params;
    const accessToken = await getValidAccessToken(req.user);
    const tables = await getTables(accessToken, baseId);
    res.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

router.get('/me/bases/:baseId/tables/:tableId/fields', async (req, res) => {
  try {
    const { baseId, tableId } = req.params;
    const accessToken = await getValidAccessToken(req.user);
    const fields = await getFields(accessToken, baseId, tableId);
    
    const supportedFields = fields
      .filter(field => isSupportedFieldType(field.type))
      .map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        mappedType: mapAirtableFieldType(field.type),
        options: field.options || {}
      }));

    res.json({ fields: supportedFields });
  } catch (error) {
    console.error('Error fetching fields:', error);
    res.status(500).json({ error: 'Failed to fetch fields' });
  }
});

router.post('/forms', async (req, res) => {
  try {
    const { airtableBaseId, airtableTableId, title, questions } = req.body;

    if (!airtableBaseId || !airtableTableId || !title || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    for (const q of questions) {
      if (!q.questionKey || !q.airtableFieldId || !q.label || !q.type) {
        return res.status(400).json({ error: 'Invalid question format' });
      }
      if (!['singleLineText', 'longText', 'singleSelect', 'multipleSelects', 'attachments'].includes(q.type)) {
        return res.status(400).json({ error: `Unsupported question type: ${q.type}` });
      }
      if (q.conditionalRules && q.conditionalRules.conditions) {
        for (const condition of q.conditionalRules.conditions) {
          if (!condition.questionKey || !condition.operator || condition.value === undefined) {
            return res.status(400).json({ error: 'Invalid conditional rule format' });
          }
        }
      }
    }

    const form = await Form.create({
      ownerUserId: req.user._id,
      airtableBaseId,
      airtableTableId,
      title,
      questions
    });

    res.status(201).json({ form });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

router.get('/forms', async (req, res) => {
  try {
    const forms = await Form.find({ ownerUserId: req.user._id })
      .select('title airtableBaseId airtableTableId createdAt updatedAt')
      .sort({ createdAt: -1 });
    res.json({ forms });
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

router.get('/forms/:formId/responses', async (req, res) => {
  try {
    const { formId } = req.params;
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const responses = await Response.find({ formId })
      .sort({ createdAt: -1 })
      .lean();

    const previewResponses = responses.map(r => ({
      _id: r._id,
      airtableRecordId: r.airtableRecordId,
      createdAt: r.createdAt,
      status: r.status,
      previewAnswers: Object.keys(r.answers).slice(0, 3).reduce((acc, key) => {
        acc[key] = r.answers[key];
        return acc;
      }, {})
    }));

    res.json({ responses: previewResponses });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

export default router;

