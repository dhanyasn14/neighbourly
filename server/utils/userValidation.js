const REQUIRED_PROFILE_FIELDS = [
  'name',
  'username',
  'email',
  'phoneNumber',
  'ownership',
  'address.houseNumber',
  'address.streetName',
  'address.areaName',
  'bio.profession',
  'bio.about',
];

function getNestedValue(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function validateRequiredProfileFields(payload, options = {}) {
  const fields = options.includePassword
    ? [...REQUIRED_PROFILE_FIELDS, 'password']
    : REQUIRED_PROFILE_FIELDS;

  const missingFields = fields.filter(field => !hasValue(getNestedValue(payload, field)));

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

module.exports = {
  REQUIRED_PROFILE_FIELDS,
  validateRequiredProfileFields,
};
