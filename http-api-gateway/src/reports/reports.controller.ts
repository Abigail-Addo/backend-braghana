import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Request,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('reports')
export class ReportsController {
  constructor(
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @Post()
  makeReport(@Body() data: any) {
    return this.natsClient.send({ cmd: 'make_report' }, data);
  }

  @Get()
  getReports(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_reports' },
      { headers: requestHeaders },
    );
  }

  @Get(':id')
  getReportById(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_a_report' },
      { headers: requestHeaders, params: { id } },
    );
  }

  @Put(':id')
  updateReportStatus(
    @Request() request: any,
    @Body('status') status: string,
    @Param('id') id: string,
  ) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'update_report_status' },
      { headers: requestHeaders, params: { id }, data: { status } },
    );
  }

  @Delete(':id')
  deleteReport(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'delete_report' },
      { headers: requestHeaders, params: { id } },
    );
  }
}
