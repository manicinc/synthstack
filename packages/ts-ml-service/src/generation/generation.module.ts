import { Module } from '@nestjs/common';
import { GenerationService } from './generation.service';
import { GenerationController, ChatController } from './generation.controller';

@Module({
  controllers: [GenerationController, ChatController],
  providers: [GenerationService],
  exports: [GenerationService],
})
export class GenerationModule {}
