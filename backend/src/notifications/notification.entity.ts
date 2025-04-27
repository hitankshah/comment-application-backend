import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Comment } from '../comments/comment.entity';

export enum NotificationType {
  REPLY = 'reply',
  MENTION = 'mention',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.notifications)
  @JoinColumn()
  recipient: User;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn()
  comment: Comment;

  @Column({ type: 'text', nullable: true })
  parentContent: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
