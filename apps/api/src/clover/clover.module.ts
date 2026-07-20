import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloverController } from './clover.controller';
import { CloverOAuthService } from './clover-oauth.service';
import { CloverSyncService } from './clover-sync.service';
import { CloverApiClientMock } from './clover-api-client.mock';
import { CloverApiClientHttp } from './clover-api-client.http';
import { CLOVER_API_CLIENT } from './interfaces/clover-api-client.interface';

@Module({
  imports: [HttpModule.register({ timeout: 15_000, maxRedirects: 0 })],
  controllers: [CloverController],
  providers: [
    CloverApiClientMock,
    CloverApiClientHttp,
    {
      provide: CLOVER_API_CLIENT,
      useFactory: (
        configService: ConfigService,
        mock: CloverApiClientMock,
        http: CloverApiClientHttp,
      ) => (configService.get<boolean>('clover.useMockClient') ? mock : http),
      inject: [ConfigService, CloverApiClientMock, CloverApiClientHttp],
    },
    CloverOAuthService,
    CloverSyncService,
  ],
  exports: [CloverOAuthService, CloverSyncService],
})
export class CloverModule {}
