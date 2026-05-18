import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { BLOG_POSTS } from '../../../content/blog/posts';

export default function BlogPreviewSection() {
  const posts = BLOG_POSTS.slice(0, 3);

  return (
    <section className="py-16 px-4 bg-white" aria-labelledby="blog-preview-heading">
      <div className="max-w-6xl mx-auto">
        <motion.div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">
              Guides
            </span>
            <h2 id="blog-preview-heading" className="font-heading text-3xl font-bold text-stone-900 mt-2">
              Salon tips for Jammu
            </h2>
          </div>
          <Link to="/blog" className="inline-flex items-center gap-2 text-orange-800 font-semibold">
            View all articles
            <ArrowRight size={18} weight="bold" />
          </Link>
        </motion.div>
        <div className="grid sm:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition-all"
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <motion.div className="aspect-[16/10] bg-gradient-to-br from-orange-100 to-stone-100" />
                <div className="p-5">
                  <p className="text-xs text-stone-500 mb-2">{post.date}</p>
                  <h3 className="font-heading font-bold text-stone-900 group-hover:text-orange-800 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-stone-500 mt-2 line-clamp-2">{post.excerpt}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
