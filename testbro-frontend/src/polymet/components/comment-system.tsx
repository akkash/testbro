import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Reply,
  MoreHorizontal,
  Edit,
  Trash2,
  Flag,
  Heart,
  ThumbsUp,
  Pin,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Send,
  Paperclip,
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  createdAt: string;
  updatedAt?: string;
  parentId?: string; // For replies
  reactions: {
    likes: number;
    hearts: number;
    userReacted?: string[]; // reaction types user has made
  };
  isPinned?: boolean;
  isResolved?: boolean;
  priority?: "low" | "medium" | "high";
  mentions?: string[]; // user IDs mentioned in comment
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
  }[];
  replies?: Comment[];
}

interface CommentSystemProps {
  entityId: string; // test case ID, result ID, etc.
  entityType: "test-case" | "test-result" | "execution" | "project";
  comments: Comment[];
  onAddComment: (content: string, parentId?: string) => void;
  onUpdateComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReactToComment: (commentId: string, reaction: string) => void;
  onPinComment: (commentId: string) => void;
  onResolveComment: (commentId: string) => void;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  className?: string;
}

export default function CommentSystem({
  entityId,
  entityType,
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onReactToComment,
  onPinComment,
  onResolveComment,
  currentUser,
  className,
}: CommentSystemProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment, replyingTo || undefined);
      setNewComment("");
      setReplyingTo(null);
    }
  };

  const handleEditComment = (commentId: string) => {
    onUpdateComment(commentId, editContent);
    setEditingComment(null);
    setEditContent("");
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "";
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={cn(
        "group relative",
        isReply ? "ml-12 mt-3" : "mt-4",
        comment.isPinned && "bg-blue-50 border border-blue-200 rounded-lg p-3"
      )}
    >
      {/* Pinned indicator */}
      {comment.isPinned && (
        <div className="flex items-center space-x-2 mb-2 text-blue-600">
          <Pin className="w-4 h-4" />

          <span className="text-sm font-medium">Pinned Comment</span>
        </div>
      )}

      <div className="flex space-x-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.author.avatar} alt={comment.author.name} />

          <AvatarFallback>
            {comment.author.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Comment header */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900 text-sm">
              {comment.author.name}
            </span>
            <Badge variant="secondary" className="text-xs">
              {comment.author.role}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(comment.createdAt)}
            </span>
            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
            {comment.priority && (
              <Badge
                variant="outline"
                className={cn("text-xs", getPriorityColor(comment.priority))}
              >
                {comment.priority}
              </Badge>
            )}
            {comment.isResolved && (
              <Badge
                variant="outline"
                className="text-xs bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Resolved
              </Badge>
            )}
          </div>

          {/* Comment content */}
          {editingComment === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px] text-sm"
                placeholder="Edit your comment..."
              />

              <div className="flex space-x-2">
                <Button size="sm" onClick={() => handleEditComment(comment.id)}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingComment(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
              {comment.content}
            </div>
          )}

          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mb-2 space-y-1">
              {comment.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Paperclip className="w-4 h-4" />

                  <a href={attachment.url} className="hover:underline">
                    {attachment.name}
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Comment actions */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {/* Reactions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onReactToComment(comment.id, "like")}
                className={cn(
                  "flex items-center space-x-1 hover:text-blue-600 transition-colors",
                  comment.reactions.userReacted?.includes("like") &&
                    "text-blue-600"
                )}
              >
                <ThumbsUp className="w-4 h-4" />

                <span>{comment.reactions.likes}</span>
              </button>
              <button
                onClick={() => onReactToComment(comment.id, "heart")}
                className={cn(
                  "flex items-center space-x-1 hover:text-red-600 transition-colors",
                  comment.reactions.userReacted?.includes("heart") &&
                    "text-red-600"
                )}
              >
                <Heart className="w-4 h-4" />

                <span>{comment.reactions.hearts}</span>
              </button>
            </div>

            {/* Reply button */}
            {!isReply && (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
              >
                <Reply className="w-4 h-4" />

                <span>Reply</span>
              </button>
            )}

            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {comment.author.id === currentUser.id && (
                  <>
                    <DropdownMenuItem onClick={() => startEdit(comment)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteComment(comment.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => onPinComment(comment.id)}>
                  <Pin className="w-4 h-4 mr-2" />

                  {comment.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onResolveComment(comment.id)}>
                  <CheckCircle className="w-4 h-4 mr-2" />

                  {comment.isResolved ? "Unresolve" : "Mark Resolved"}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}

          {/* Reply form */}
          {replyingTo === comment.id && (
            <div className="mt-3 ml-11">
              <div className="flex space-x-2">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage
                    src={currentUser.avatar}
                    alt={currentUser.name}
                  />

                  <AvatarFallback className="text-xs">
                    {currentUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={`Reply to ${comment.author.name}...`}
                    className="min-h-[60px] text-sm"
                  />

                  <div className="flex justify-between items-center mt-2">
                    <div className="flex space-x-2 text-xs text-gray-500">
                      <button className="hover:text-gray-700">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button className="hover:text-gray-700">
                        <AtSign className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReplyingTo(null)}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSubmitComment}>
                        <Send className="w-4 h-4 mr-1" />
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const sortedComments = [...comments].sort((a, b) => {
    // Pinned comments first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then by creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Comment stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center space-x-1">
            <MessageCircle className="w-4 h-4" />

            <span>{comments.length} comments</span>
          </span>
          <span className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4" />

            <span>{comments.filter((c) => c.isResolved).length} resolved</span>
          </span>
        </div>
      </div>

      {/* New comment form */}
      {!replyingTo && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />

              <AvatarFallback>
                {currentUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={`Add a comment to this ${entityType.replace("-", " ")}...`}
                className="min-h-[80px] border-0 p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <div className="flex space-x-2 text-gray-500">
                  <button className="hover:text-gray-700 transition-colors">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button className="hover:text-gray-700 transition-colors">
                    <AtSign className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-1">
        {sortedComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />

            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          sortedComments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
}
