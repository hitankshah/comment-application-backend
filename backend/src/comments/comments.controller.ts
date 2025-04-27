import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findAll() {
    return this.commentsService.getThreads();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: { content: string; parentId?: string }, @Req() req) {
    return this.commentsService.create(body.content, req.user, body.parentId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body('content') content: string, @Req() req) {
    return this.commentsService.update(id, content, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.commentsService.softDelete(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/restore')
  restore(@Param('id') id: string, @Req() req) {
    return this.commentsService.restore(id, req.user.userId);
  }
}