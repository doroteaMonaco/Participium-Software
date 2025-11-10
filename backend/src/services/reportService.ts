import reportRepository from '../repositories/reportRepository';
import { CreateReportDto, ReportResponseDto } from '../models/dto/reportDto';

const findAll = async (): Promise<ReportResponseDto[]> => {
  return reportRepository.findAll();
};

const findById = async (id: number): Promise<ReportResponseDto | null> => {
  return reportRepository.findById(id);
};

const submitReport = async (data: CreateReportDto): Promise<ReportResponseDto> => {
  return reportRepository.create(data);
};

const deleteReport = async (id: number): Promise<ReportResponseDto> => {
  return reportRepository.deleteById(id);
};

export default { 
  findAll, 
  findById, 
  submitReport, 
  deleteReport 
};