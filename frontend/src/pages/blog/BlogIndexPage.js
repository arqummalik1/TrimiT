import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BLOG_POSTS } from '../../content/blog/posts';

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-4xl font-bold text-stone-900 mb-2">TrimiT Blog</h1>
        <p className="text-stone-500 mb-10">Guides for salon booking and grooming in Jammu.</p>
        <div className="space-y-6">
          {BLOG_POSTS.map((post, i) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/blog/${post.slug}`}
                className="group flex flex-col sm:flex-row gap-5 rounded-2xl bg-white border border-stone-200 p-6 hover:shadow-lg transition-all items-start"
              >
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  {post.icon}
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-1">{post.date}</p>
                  <h2 className="font-heading text-xl font-bold text-stone-900 group-hover:text-orange-800 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-stone-600 mt-2">{post.excerpt}</p>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
