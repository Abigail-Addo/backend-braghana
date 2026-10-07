import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { Auth } from 'src/iam/authentication/decorator/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { PrismaService } from 'src/prisma/prisma.service';

@Auth(AuthType.None)
@Controller()
export class ReportsMicroserviceController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'make_report' })
  async makeReport(@Payload() data: any) {
    const report = await this.prisma.report.create({
      data: {
        fullname: data.fullname,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
      },
    });

    this.natsClient.emit('report_created', report);
    return report;
  }

  @MessagePattern({ cmd: 'get_reports' })
  async getReports() {
    return this.prisma.report.findMany();
  }

  @MessagePattern({ cmd: 'get_a_report' })
  async getReportById(@Payload() payload: any) {
    const { id } = payload.params;
    return this.prisma.report.findUnique({
      where: { reportId: id },
    });
  }

  @MessagePattern({ cmd: 'update_report_status' })
  async updateReportStatus(@Payload() payload: any) {
    const { id } = payload.params;
    const { status } = payload.data;

    return this.prisma.report.update({
      where: { reportId: id },
      data: { updatedAt: new Date(), reportStatus: status },
    });
  }

  @MessagePattern({ cmd: 'delete_report' })
  async deleteReport(@Payload() payload: any) {
    const { id } = payload.params;

    await this.prisma.report.delete({
      where: { reportId: id },
    });

    this.natsClient.emit('report_deleted', { id });
    return { message: 'Report deleted by admin successfully', id };
  }
}
