import { Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { Auth } from 'src/iam/authentication/decorator/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller()
export class AdsMicroserviceController {
  private readonly logger = new Logger(AdsMicroserviceController.name);
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'create_ad' })
  async createAd(@Payload() payload: any) {
    try {
      const { data } = payload;
      const ad = await this.prisma.ad.create({
        data: {
          title: data.title,
          content: data.content,
          imageUrl: data.imageUrl,
          linkUrl: data.linkUrl,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        },
      });
      return { success: true, ad };
    } catch (error) {
      this.logger.error('Error creating ad', error);
      return { success: false, error: error.message };
    }
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_all_ads' })
  async getAllAds() {
    try {
      const ads = await this.prisma.ad.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, ads };
    } catch (error) {
      this.logger.error('Error retrieving all ads', error);
      return { success: false, error: error.message };
    }
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_ad' })
  async getAd(@Payload() payload: any) {
    try {
      const { params } = payload;
      const ad = await this.prisma.ad.findUnique({
        where: { adId: params.adId },
      });
      if (!ad) {
        return { success: false, error: 'Ad not found' };
      }
      return { success: true, ad };
    } catch (error) {
      this.logger.error('Error retrieving ad', error);
      return { success: false, error: error.message };
    }
  }

  @MessagePattern({ cmd: 'update_ad' })
  async updateAd(@Payload() payload: any) {
    try {
      const { params, data } = payload;
      const updatedAd = await this.prisma.ad.update({
        where: { adId: params.adId },
        data,
      });
      return { success: true, updatedAd };
    } catch (error) {
      this.logger.error('Error updating ad', error);
      return { success: false, error: error.message };
    }
  }

  @MessagePattern({ cmd: 'delete_ad' })
  async deleteAd(@Payload() payload: any) {
    try {
      const { params } = payload;
      await this.prisma.ad.delete({
        where: { adId: params.adId },
      });
      return { success: true, message: 'Ad deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting ad', error);
      return { success: false, error: error.message };
    }
  }
}
