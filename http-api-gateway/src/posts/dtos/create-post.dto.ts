import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// enum of possible reactions
export enum ReactionType {
  LIKE = 'Like',
  LOVE = 'Love',
  HAHA = 'Haha',
  WOW = 'Wow',
  SAD = 'Sad',
  ANGRY = 'Angry',
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  mediaUrl?: string;
}

export class ReactionDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(ReactionType, {
    message: 'Reaction must be one of: Like, Love, Haha, Wow, Sad, Angry',
  })
  reaction: ReactionType;
}
