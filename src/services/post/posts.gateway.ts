import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PostsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    console.log('WebSocket initialized');
  }

  handleConnection(client: any, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Example: Emitting a new post to all connected clients
  public emitNewPost(post: any) {
    console.log(post);
    this.server.emit('newPost', post);
  }

  public emitDeletePost(post: any) {
    this.server.emit('deletePost', post);
  }

  public emitUpdatePost(post: any) {
    this.server.emit('updatePost', post);
  }

  public emitPostLiked(payload: {
    postId: string;
    likeCount: number;
    likerUserId: string;
    likerUsername: string;
    postOwnerId: string;
  }) {
    this.server.emit('postLiked', payload);
  }

  public emitPostUnliked(payload: { postId: string; likeCount: number }) {
    this.server.emit('postUnliked', payload);
  }

  public emitFollow(payload: {
    followerId: string;
    followingId: string;
    followerUsername: string;
    followingUsername: string;
  }) {
    this.server.emit('follow', payload);
  }
}
