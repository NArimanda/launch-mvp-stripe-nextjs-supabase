'use client';

import { useState, useCallback, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, X } from 'lucide-react';
import { addHeroArticle, deleteHeroArticle, reorderHeroArticles } from './actions';

interface HeroArticle {
  id: string;
  title: string;
  image_path: string | null;
  href: string;
  kicker: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface HeroAdminClientProps {
  initialArticles: HeroArticle[];
}

function DeleteButton({ articleId }: { articleId: string }) {
  const { pending } = useFormStatus();
  const [state, formAction] = useActionState(deleteHeroArticle, null);
  const router = useRouter();
  const prevStateRef = useRef<string | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      if (state === null && submittedRef.current) {
        router.refresh();
        submittedRef.current = false;
      }
    }
  }, [state, router]);

  const handleSubmit = () => {
    submittedRef.current = true;
  };

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="articleId" value={articleId} />
      <button
        type="submit"
        disabled={pending}
        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
        aria-label="Delete article"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

function SortableArticleItem({ article }: { article: HeroArticle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: article.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get public URL for image
  const imageUrl = article.image_path 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/hero-images/${article.image_path}`
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      
      {imageUrl && (
        <img
          src={imageUrl}
          alt={article.title}
          className="w-24 h-16 object-cover rounded"
        />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 dark:text-white truncate">{article.title}</div>
        <div className="text-sm text-slate-600 dark:text-slate-400 truncate">{article.href}</div>
        {article.kicker && (
          <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">{article.kicker}</div>
        )}
      </div>
      
      <DeleteButton articleId={article.id} />
    </div>
  );
}

function AddArticleSubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Adding...' : 'Add Article'}
    </button>
  );
}

function AddArticleForm() {
  const [state, formAction] = useActionState(addHeroArticle, null);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const prevStateRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      if (state === null && submittedRef.current) {
        // Success - reset form and close
        setIsOpen(false);
        setImagePreview(null);
        formRef.current?.reset();
        router.refresh();
        submittedRef.current = false;
      }
    }
  }, [state, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    submittedRef.current = true;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Article
      </button>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add New Article</h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setImagePreview(null);
            formRef.current?.reset();
          }}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <form ref={formRef} action={formAction} onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Article URL *
            </label>
            <input
              type="url"
              name="href"
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Kicker (optional)
            </label>
            <input
              type="text"
              name="kicker"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Image *
            </label>
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-2 w-32 h-20 object-cover rounded"
              />
            )}
          </div>

          {state && state !== null && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
              {state}
            </div>
          )}

          <div className="flex gap-2">
            <AddArticleSubmitButton />
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setImagePreview(null);
                formRef.current?.reset();
              }}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function HeroAdminClient({ initialArticles }: HeroAdminClientProps) {
  const [articles, setArticles] = useState<HeroArticle[]>(initialArticles);
  const [reorderState, reorderFormAction] = useActionState(reorderHeroArticles, null);
  const router = useRouter();
  const prevReorderStateRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setArticles(initialArticles);
  }, [initialArticles]);

  useEffect(() => {
    if (prevReorderStateRef.current !== reorderState) {
      prevReorderStateRef.current = reorderState;
      if (reorderState === null) {
        router.refresh();
      }
    }
  }, [reorderState, router]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = articles.findIndex((item) => item.id === active.id);
      const newIndex = articles.findIndex((item) => item.id === over.id);

      const newArticles = arrayMove(articles, oldIndex, newIndex);
      
      // Update display_order for each item
      const orderData = newArticles.map((article, index) => ({
        id: article.id,
        display_order: index,
      }));

      // Update state optimistically
      setArticles(newArticles.map((article, index) => ({
        ...article,
        display_order: index,
      })));

      // Submit reorder to server
      const formData = new FormData();
      formData.append('order', JSON.stringify(orderData));
      await reorderFormAction(formData);
    }
  }, [articles, reorderFormAction]);

  return (
    <div className="space-y-6">
      <AddArticleForm />

      {reorderState && reorderState !== null && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
          {reorderState}
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Articles ({articles.length})
        </h2>

        {articles.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">No articles yet. Add one to get started.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={articles.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {articles.map((article) => (
                  <SortableArticleItem key={article.id} article={article} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
