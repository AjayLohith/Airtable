import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionKey: {
    type: String,
    required: true
  },
  airtableFieldId: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['singleLineText', 'longText', 'singleSelect', 'multipleSelects', 'attachments'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  conditionalRules: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  options: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const formSchema = new mongoose.Schema({
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  airtableBaseId: {
    type: String,
    required: true
  },
  airtableTableId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  questions: [questionSchema]
}, {
  timestamps: true
});

export default mongoose.model('Form', formSchema);

