-- System Templates - UK Tax Specific

INSERT INTO templates (name, description, category, is_system, items) VALUES
(
  'SA100 Self Assessment 2024/25',
  'Complete document checklist for Self Assessment tax return',
  'self_assessment',
  true,
  '[
    {"label": "P60 2024/25", "description": "End of year certificate from employer", "required": true},
    {"label": "P11D 2024/25", "description": "Benefits and expenses from employer", "required": false},
    {"label": "Bank interest certificates", "description": "Interest earned on savings accounts", "required": true},
    {"label": "Dividend vouchers", "description": "Dividend payments received from companies", "required": false},
    {"label": "Rental income summary", "description": "Summary of rental income and expenses", "required": false},
    {"label": "Mortgage interest statement", "description": "Annual mortgage interest statement for rental properties", "required": false},
    {"label": "Pension contributions", "description": "Evidence of personal pension contributions", "required": false},
    {"label": "Gift Aid receipts", "description": "Charitable donation receipts for Gift Aid claims", "required": false},
    {"label": "Capital gains records", "description": "Records of asset disposals (shares, property, etc.)", "required": false},
    {"label": "Self-employment income records", "description": "Sales invoices, income records for self-employment", "required": false},
    {"label": "Self-employment expense receipts", "description": "Business expense receipts and records", "required": false}
  ]'::jsonb
),
(
  'MTD ITSA Quarterly (Q1 Apr-Jun)',
  'Quarterly submission documents for MTD Income Tax Self Assessment - Quarter 1',
  'mtd_itsa',
  true,
  '[
    {"label": "Bank statements (April-June)", "description": "All business bank statements for the quarter", "required": true},
    {"label": "Sales invoices", "description": "All sales invoices issued during the quarter", "required": true},
    {"label": "Purchase receipts", "description": "All business purchase receipts and invoices", "required": true},
    {"label": "Mileage log", "description": "Business mileage records for the quarter", "required": false},
    {"label": "Home office calculation", "description": "Home office usage calculation if applicable", "required": false}
  ]'::jsonb
),
(
  'MTD ITSA Quarterly (Q2 Jul-Sep)',
  'Quarterly submission documents for MTD Income Tax Self Assessment - Quarter 2',
  'mtd_itsa',
  true,
  '[
    {"label": "Bank statements (July-September)", "description": "All business bank statements for the quarter", "required": true},
    {"label": "Sales invoices", "description": "All sales invoices issued during the quarter", "required": true},
    {"label": "Purchase receipts", "description": "All business purchase receipts and invoices", "required": true},
    {"label": "Mileage log", "description": "Business mileage records for the quarter", "required": false},
    {"label": "Home office calculation", "description": "Home office usage calculation if applicable", "required": false}
  ]'::jsonb
),
(
  'MTD ITSA Quarterly (Q3 Oct-Dec)',
  'Quarterly submission documents for MTD Income Tax Self Assessment - Quarter 3',
  'mtd_itsa',
  true,
  '[
    {"label": "Bank statements (October-December)", "description": "All business bank statements for the quarter", "required": true},
    {"label": "Sales invoices", "description": "All sales invoices issued during the quarter", "required": true},
    {"label": "Purchase receipts", "description": "All business purchase receipts and invoices", "required": true},
    {"label": "Mileage log", "description": "Business mileage records for the quarter", "required": false},
    {"label": "Home office calculation", "description": "Home office usage calculation if applicable", "required": false}
  ]'::jsonb
),
(
  'MTD ITSA Quarterly (Q4 Jan-Mar)',
  'Quarterly submission documents for MTD Income Tax Self Assessment - Quarter 4',
  'mtd_itsa',
  true,
  '[
    {"label": "Bank statements (January-March)", "description": "All business bank statements for the quarter", "required": true},
    {"label": "Sales invoices", "description": "All sales invoices issued during the quarter", "required": true},
    {"label": "Purchase receipts", "description": "All business purchase receipts and invoices", "required": true},
    {"label": "Mileage log", "description": "Business mileage records for the quarter", "required": false},
    {"label": "Home office calculation", "description": "Home office usage calculation if applicable", "required": false}
  ]'::jsonb
),
(
  'New Client Onboarding',
  'Essential documents needed when onboarding a new client',
  'onboarding',
  true,
  '[
    {"label": "Photo ID verification", "description": "Passport or driving licence copy", "required": true},
    {"label": "Proof of address", "description": "Utility bill or bank statement (less than 3 months old)", "required": true},
    {"label": "Previous tax returns", "description": "Last 2 years tax returns if available", "required": false},
    {"label": "UTR number", "description": "Unique Taxpayer Reference number", "required": true},
    {"label": "HMRC login details", "description": "Government Gateway login credentials", "required": false},
    {"label": "Bank details", "description": "Business bank account details for HMRC repayments", "required": true},
    {"label": "National Insurance number", "description": "Your National Insurance number", "required": true}
  ]'::jsonb
),
(
  'Corporation Tax',
  'Documents needed for Corporation Tax return preparation',
  'corporation_tax',
  true,
  '[
    {"label": "Annual accounts", "description": "Draft or final annual accounts", "required": true},
    {"label": "Bank statements (full year)", "description": "All company bank statements for the accounting period", "required": true},
    {"label": "Director loan account", "description": "Director loan account transactions", "required": false},
    {"label": "Dividend minutes", "description": "Board minutes for dividend declarations", "required": false},
    {"label": "P11D details", "description": "Benefits in kind provided to directors/employees", "required": false},
    {"label": "Fixed asset purchases", "description": "Details of any capital expenditure", "required": false},
    {"label": "R&D expenditure", "description": "Research and development costs if applicable", "required": false}
  ]'::jsonb
),
(
  'VAT Return',
  'Documents needed for VAT return preparation',
  'vat',
  true,
  '[
    {"label": "Sales invoices", "description": "All sales invoices for the VAT period", "required": true},
    {"label": "Purchase invoices", "description": "All purchase invoices for the VAT period", "required": true},
    {"label": "Bank statements", "description": "Bank statements covering the VAT period", "required": true},
    {"label": "EC sales list", "description": "Details of sales to EU businesses if applicable", "required": false},
    {"label": "Import/export documentation", "description": "Customs declarations and import VAT certificates", "required": false}
  ]'::jsonb
);
