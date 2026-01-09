'use client';

import { useEffect, useState, useRef, useActionState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import MovieCommentsList from './MovieCommentsList';
import { X, Send, AlertCircle, Image, XCircle } from 'lucide-react';
import { setUsernameAction } from '@/app/actions/usernameActions';

interface PendingComment {
  id: string;
  movie_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  approved: boolean;
  created_at: string;
  username?: string;
  isPending: true;
  position_market_type?: string | null;
  position_selected_range?: string | null;
  position_points?: number | null;
  image_path?: string | null;
  image_mime?: string | null;
  image_size?: number | null;
}

interface MovieCommentsProps {
  movieId: string;
}

export default function MovieComments({ movieId }: MovieCommentsProps) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Server action state for username form
  const [usernameFormState, usernameFormAction, isSettingUsername] = useActionState(setUsernameAction, null);

  // Get current user session and admin status
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Fetch username and admin status
        const { data } = await supabase
          .from('users')
          .select('username, is_admin')
          .eq('id', session.user.id)
          .single();
        if (data) {
          if (data.username) {
            setUsername(data.username);
          } else {
            setShowUsernameModal(true);
          }
          setIsAdmin(data.is_admin === true);
        }
      }
    };
    getSession();
  }, []);

  // Handle successful username set
  useEffect(() => {
    // When form state is null (success) and not currently submitting, refresh username
    if (usernameFormState === null && !isSettingUsername) {
      // Only refresh if we have a user and usernameInput was set (meaning form was submitted)
      if (user && usernameInput.trim()) {
        const refreshUsername = async () => {
          const { data } = await supabase
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single();
          if (data?.username) {
            setUsername(data.username);
            setShowUsernameModal(false);
            setUsernameInput('');
            if (formRef.current) {
              formRef.current.reset();
            }
          }
        };
        refreshUsername();
      }
    }
  }, [usernameFormState, isSettingUsername, user, usernameInput]);

  const handleReply = (commentId: string) => {
    setReplyToId(commentId);
    // Scroll to comment composer
    document.getElementById('comment-composer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      setImagePreview(null);
      setImageError(null);
      return;
    }

    // Validate file size (6MB max)
    if (file.size >= 6 * 1024 * 1024) {
      setImageError('Image size must be less than 6MB');
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Image must be JPEG, PNG, or WebP');
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    // Validate image dimensions (must be less than 4096px in both width and height)
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width >= 4096 || img.height >= 4096) {
          setImageError('Image dimensions must be less than 4096x4096 pixels');
          setSelectedImage(null);
          setImagePreview(null);
          return;
        }
        // Dimensions OK - proceed
        setImageError(null);
        setSelectedImage(file);
        setImagePreview(reader.result as string);
      };
      img.onerror = () => {
        setImageError('Failed to load image. Please ensure the file is a valid image.');
        setSelectedImage(null);
        setImagePreview(null);
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setImageError('Failed to read image file');
      setSelectedImage(null);
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageError(null);
    // Reset file input
    const fileInput = document.getElementById('comment-image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };


  const handleSubmitComment = async () => {
    if (!user || !username) return;
    if (!commentBody.trim()) return;

    setIsSubmitting(true);

    try {
      // Validate image file type before proceeding
      if (selectedImage) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(selectedImage.type)) {
          alert('Image must be JPEG, PNG, or WebP');
          setIsSubmitting(false);
          return;
        }
        if (selectedImage.size >= 6 * 1024 * 1024) {
          alert('Image size must be less than 6MB');
          setIsSubmitting(false);
          return;
        }
      }

      // Fetch markets for this movie
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('id, type')
        .eq('movie_id', movieId);

      if (marketsError) {
        console.error('Error fetching markets:', marketsError);
      }

      let positionMarketType: string | null = null;
      let positionSelectedRange: string | null = null;
      let positionPoints: number | null = null;

      // If markets exist, fetch user's most recent bet
      if (marketsData && marketsData.length > 0) {
        const marketIds = marketsData.map(m => m.id);
        const marketTypeMap = new Map(marketsData.map(m => [m.id, m.type]));

        const { data: betData, error: betError } = await supabase
          .from('bets')
          .select('market_id, selected_range, points, placed_at')
          .eq('user_id', user.id)
          .in('market_id', marketIds)
          .order('placed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (betError) {
          console.error('Error fetching user bet:', betError);
        } else if (betData) {
          positionMarketType = marketTypeMap.get(betData.market_id) || null;
          positionSelectedRange = betData.selected_range;
          positionPoints = betData.points;
        }
      }

      // Create FormData with all fields
      // Note: user_id is no longer sent - server authenticates and uses authenticated user's ID
      const formData = new FormData();
      formData.append('movie_id', movieId);
      if (replyToId) {
        formData.append('parent_id', replyToId);
      }
      formData.append('body', commentBody.trim());
      if (positionMarketType) {
        formData.append('position_market_type', positionMarketType);
      }
      if (positionSelectedRange) {
        formData.append('position_selected_range', positionSelectedRange);
      }
      if (positionPoints) {
        formData.append('position_points', positionPoints.toString());
      }
      
      // Append image file if present
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      // Submit comment with FormData (handles text + image in single request)
      const response = await fetch('/api/comments/submit', {
        method: 'POST',
        credentials: 'include',
        body: formData, // Don't set Content-Type header - browser will set it with boundary
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('Error submitting comment:', result.error);
        alert(`Failed to submit comment: ${result.error || 'Please try again.'}`);
        setIsSubmitting(false);
        return;
      }

      const data = result.data;

      // Add to pending comments optimistically
      const pendingComment: PendingComment = {
        id: data.id,
        movie_id: data.movie_id,
        user_id: data.user_id,
        parent_id: data.parent_id,
        body: data.body,
        approved: data.approved || false,
        created_at: data.created_at,
        username: username,
        isPending: true,
        position_market_type: positionMarketType,
        position_selected_range: positionSelectedRange,
        position_points: positionPoints,
        image_path: data.image_path || null,
        image_mime: data.image_mime || null,
        image_size: data.image_size || null
      };

      setPendingComments(prev => [...prev, pendingComment]);

      // Reset form
      setCommentBody('');
      setReplyToId(null);
      setSelectedImage(null);
      setImagePreview(null);
      setImageError(null);
      // Reset file input
      const fileInput = document.getElementById('comment-image-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuoteReferences = (text: string) => {
    const parts = text.split(/(>>[a-f0-9-]+)/gi);
    return parts.map((part, index) => {
      if (part.match(/^>>[a-f0-9-]+$/i)) {
        return (
          <span 
            key={index} 
            className="text-slate-500 dark:text-slate-400 italic font-mono text-sm break-words [overflow-wrap:anywhere] [word-break:break-word]"
          >
            {part}
          </span>
        );
      }
      return (
        <span 
          key={index}
          className="break-words [overflow-wrap:anywhere] [word-break:break-word]"
        >
          {part}
        </span>
      );
    });
  };


  return (
    <div className="mt-8">
      {/* Username Onboarding Modal */}
      {showUsernameModal && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-dark rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Set Your Username
              </h2>
              <button
                onClick={() => {
                  // Don't allow closing if username is required
                  if (!username) return;
                  setShowUsernameModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                disabled={!username}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Choose a username to start commenting. This will be displayed with your comments.
            </p>
            <form ref={formRef} action={usernameFormAction} className="space-y-4">
              <div>
                <input
                  type="text"
                  name="username"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSettingUsername) {
                      e.preventDefault();
                      formRef.current?.requestSubmit();
                    }
                  }}
                  placeholder="username"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  disabled={isSettingUsername}
                />
                {usernameFormState && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {usernameFormState}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>
              <button
                type="submit"
                disabled={isSettingUsername || !usernameInput.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSettingUsername ? 'Setting...' : 'Set Username'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Comment Composer */}
      <div id="comment-composer" className="mb-6">
        {!user ? (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-center">
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                Sign in
              </button>
              {' '}to comment
            </p>
          </div>
        ) : !username ? (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-center">
              Please set your username to comment
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-dark rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            {replyToId && (
              <div className="mb-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded p-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Replying to comment
                </span>
                <button
                  onClick={() => setReplyToId(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={replyToId ? "Write your reply..." : "Write a comment..."}
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            
            {/* Character counter */}
            <div className="mt-1 text-right">
              <span className={`text-xs ${
                commentBody.length >= 2000
                  ? 'text-red-600 dark:text-red-400'
                  : commentBody.length > 1800 
                  ? 'text-orange-600 dark:text-orange-400' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
                {commentBody.length} / 2000
              </span>
            </div>
            
            {/* Image Upload Section */}
            <div className="mt-3">
              <label
                htmlFor="comment-image-input"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Image className="h-4 w-4" />
                <span>Add Image (optional)</span>
              </label>
              <input
                id="comment-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {imageError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {imageError}
                </p>
              )}
              
              {imagePreview && (
                <div className="mt-3 relative inline-block">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-xs max-h-48 rounded-lg border border-slate-300 dark:border-slate-600"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg"
                      type="button"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedImage?.name} ({(selectedImage?.size || 0) / 1024 / 1024 < 1 
                      ? `${Math.round((selectedImage?.size || 0) / 1024)} KB`
                      : `${((selectedImage?.size || 0) / 1024 / 1024).toFixed(2)} MB`})
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comments require approval before being displayed
              </p>
              <button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !commentBody.trim() || commentBody.length > 2000}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending Comments Notice */}
      {pendingComments.length > 0 && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            You have {pendingComments.length} comment{pendingComments.length > 1 ? 's' : ''} pending approval
          </p>
        </div>
      )}

      {/* Comments List */}
      <MovieCommentsList 
        movieId={movieId} 
        mode={isAdmin ? 'admin' : 'public'}
        pendingComments={pendingComments}
        onReply={handleReply}
        renderQuoteReferences={renderQuoteReferences}
        isAdmin={isAdmin}
      />
    </div>
  );
}

