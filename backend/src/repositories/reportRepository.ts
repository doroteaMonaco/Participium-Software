import { prisma } from "../database/connection";
import { CreateReportDto } from "../models/dto/reportDto";

const findAll = async () => {
  return prisma.report.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

const findById = async (id: number) => {
  return prisma.report.findUnique({
    where: { id },
  });
};

const create = async (data: CreateReportDto) => {
  return prisma.report.create({
    data: {
      latitude: data.latitude,
      longitude: data.longitude,
      title: data.title,
      description: data.description,
      category: data.category as any,
      photos: data.photoKeys,
    },
  });
};

const deleteById = async (id: number) => {
  return prisma.report.delete({
    where: { id },
  });
};

const update = async (id: number, data: Partial<{ photos: string[] }>) => {
  return prisma.report.update({
    where: { id },
    data,
  });
};

export default {
  findAll,
  findById,
  create,
  deleteById,
  update,
};
