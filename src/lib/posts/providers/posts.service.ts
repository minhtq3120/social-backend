import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { userInfo } from 'os';
import { PostPrivateOutput } from 'src/dtos/post/postNew.dto';
import { Post, PostDocument } from 'src/entities/post.entity';
import { UserDocument } from 'src/entities/user.entity';
import { StringHandlersHelper } from 'src/helpers/stringHandler.helper';
import { FollowingsService } from 'src/lib/followings/providers/followings.service';
import { HashtagsService } from 'src/lib/hashtags/hashtags.service';
import { MediaFilesService } from 'src/lib/mediaFiles/mediaFiles.service';
import { UsersAuthController } from 'src/lib/users/controllers/auth.controller';
import { UploadsService } from 'src/uploads/uploads.service';
import { POSTS_PER_PAGE, VIET_NAM_TZ } from 'src/utils/constants';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private stringHandlersHelper: StringHandlersHelper,
    private filesService: MediaFilesService,
    private followingsService: FollowingsService,
    private hashtagsService: HashtagsService,
  ) {}

  // new post
  public async createNewPostPrivate(
    userId: string,
    description: string,
    imageOrVideos: Express.Multer.File[],
  ): Promise<void> {
    try {
      const fileUrlPromises = [];
      console.log(imageOrVideos[0]);
      for (const item of imageOrVideos) {
        const filePath = `post/imageOrVideos/${userId}${this.stringHandlersHelper.generateString(
          15,
        )}`;
        const promise = this.filesService.saveFile(
          item,
          filePath,
          description,
          userId,
        );
        fileUrlPromises.push(promise);
      }
      const fileUrls = await Promise.all(fileUrlPromises);
      const hashtags =
        this.stringHandlersHelper.getHashtagFromString(description);
      const newPost: Partial<PostDocument> = {
        user: Types.ObjectId(userId),
        description: description,
        mediaFiles: fileUrls,
        hashtags: hashtags,
        reactions: {
          loves: 0,
          likes: 0,
          hahas: 0,
          wows: 0,
          sads: 0,
          angrys: 0,
        },
        comments: 0,
      };
      await Promise.all([
        new this.postModel(newPost).save(),
        this.hashtagsService.addHastags(hashtags),
      ]);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  public async getPost(postId: string): Promise<Post> {
    try {
      return await this.postModel.findById(postId);
    } catch (err) {
      throw new InternalServerErrorException(err);
    }
  }

  public async updatePostCommentAndReactionCount(
    postId: string,
    update,
  ): Promise<Post> {
    try {
      return await this.postModel.findByIdAndUpdate(postId, update);
    } catch (err) {
      throw new InternalServerErrorException(err);
    }
  }

  // public async createNewPostGroup(
  //   userId: string,
  //   groupId: Types.ObjectId,
  //   description: string,
  //   imageOrVideo: Express.Multer.File,
  // ): Promise<void> {
  //   try {
  //     let fileUrl = '';
  //     if (description) {
  //       const filePath = `post/imageOrVideo/${userId}${this.stringHandlersHelper.generateString(
  //         15,
  //       )}`;
  //       const promise = await this.uploadsService.uploadImageFile(
  //         imageOrVideo,
  //         filePath,
  //       );
  //       if (promise) {
  //         fileUrl = promise[0];
  //       }
  //     }
  //     const newPost: Partial<PostDocument> = {
  //       user: Types.ObjectId(userId),
  //       group: Types.ObjectId(groupId.toString()),
  //       description: description,
  //       imageOrVideo: fileUrl,
  //       hashtag: this.stringHandlersHelper.getHashtagFromString(description),
  //       userLike: ['-1'],
  //       userView: ['-1'],
  //       comment: ['-1'],
  //     };
  //     await new this.postModel(newPost).save();
  //   } catch (error) {
  //     throw new InternalServerErrorException(error);
  //   }
  // }

  public async getPostNewFeed(
    pageNumber: number,
    currentUser: string,
  ): Promise<PostPrivateOutput[]> {
    dayjs.extend(timezone);
    dayjs.extend(utc);
    const limit = POSTS_PER_PAGE;
    const skip =
      !pageNumber || pageNumber < 0 ? 0 : pageNumber * POSTS_PER_PAGE;
    const searchUsers = await this.followingsService.getFollowingIds(
      currentUser,
    );
    searchUsers.push(currentUser);
    const userObjectIds = searchUsers.map((i) => Types.ObjectId(i));
    const posts = await this.postModel
      .find({ user: { $in: userObjectIds } })
      .populate('user', ['_id', 'displayName', 'avatar'])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const result = posts.map((post) => {
      const postId = (post as any)._id;
      const createdAt = dayjs(String((post as any).createdAt))
        .tz(VIET_NAM_TZ)
        .format();

      const user = post.user as any;
      const reactionsArr = Object.entries<number>(post.reactions).sort(
        (el1, el2) => {
          return Number(el2[1]) - Number(el1[1]);
        },
      );
      let total = 0;
      for (const key in post.reactions) total += post.reactions[key];
      const reactions: { [reactionType: string]: number } =
        Object.fromEntries<number>(
          reactionsArr.slice(0, 3).filter((i) => Number(i[1]) > 0),
        );
      reactions.total = total;
      return {
        postId: postId,
        userId: user._id,
        userDisplayName: user.displayName,
        userAvatar: user.avatar,
        description: post.description,
        files: post.mediaFiles,
        reactions: reactions,
        comments: post.comments,
        isCurrentUser: user._id.toString() === currentUser,
        createdAt: createdAt,
      };
    });
    return result;
  }
}
