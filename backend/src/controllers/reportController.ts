import { Request, Response } from 'express';
import reportService from '../services/reportService';

export const getReports = async (_req: Request, res: Response) => {
  try {
    const reports = await reportService.findAll();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const getReportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await reportService.findById(parseInt(id));
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

export const submitReport = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const report = await reportService.submitReport({ latitude: Number(latitude), longitude: Number(longitude) });
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedReport = await reportService.deleteReport(parseInt(id));
    res.json(deletedReport);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete report' });
  }
};