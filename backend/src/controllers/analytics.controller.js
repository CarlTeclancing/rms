import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/prisma.js';
import { buildBusinessIntelligence, businessIntelligenceCsv, businessIntelligencePdf } from '../services/analytics.service.js';

export const getBusinessIntelligence = asyncHandler(async (req, res) => {
  const data = await buildBusinessIntelligence(prisma, req.query);
  res.json(data);
});

export const exportBusinessIntelligence = asyncHandler(async (req, res) => {
  const data = await buildBusinessIntelligence(prisma, req.query);
  const format = req.query.format === 'pdf' ? 'pdf' : 'csv';

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="business-intelligence-report.pdf"');
    return res.send(businessIntelligencePdf(data));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="business-intelligence-report.csv"');
  res.send(businessIntelligenceCsv(data));
});
