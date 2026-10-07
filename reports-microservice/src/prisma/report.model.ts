import { Prisma, Type } from '@prisma/client';

export class Report implements Prisma.ReportCreateInput {
  reportId: string;
  fullname: string;
  email: string;
  message: string;
  phone: string;
  reportType: Type;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
}
