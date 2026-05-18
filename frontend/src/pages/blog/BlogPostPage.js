import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import MarkdownView from '../../components/MarkdownView';
import { getPostBySlug } from '../../content/blog/posts';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <article className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <nav className="flex items-center gap-1 text-sm text-stone-500 mb-8">
          <Link to="/" className="hover:text-orange-800">
            Home
          </Link>
          <CaretRight size={14} />
          <Link to="/blog" className="hover:text-orange-800">
            Blog
          </Link>
          <CaretRight size={14} />
          <span className="text-stone-800 line-clamp-1">{post.title}</span>
        </nav>
        <p className="text-sm text-stone-500 mb-2">{post.date}</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 mb-8">
          {post.title}
        </h1>
        <MarkdownView content={post.body} />
      </div>
    </article>
  );
}
