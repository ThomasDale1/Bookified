import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

const HeroSection = () => {
  return (
    <section className="library-hero-card mb-10 md:mb-16">
        <div className="library-hero-content">
          <div className="library-hero-text">
            <h1 className="library-hero-title">Your Library</h1>
            <p className="library-hero-description">
              Convert your books into interactive AI conversations.
              Listen, learn, and discuss your favorite reads.
            </p>
            <Link href="/books/new" className="library-cta-primary">
              + Add new book
            </Link>
          </div>

          <div className="library-hero-illustration-desktop">
            <Image
              src="/assets/hero-illustration.png"
              alt="Vintage books and globe illustration"
              width={400}
              height={300}
              className="object-contain"
              priority
            />
          </div>

          <div className="library-steps-card">
            <div className="flex flex-col gap-4">
              <div className="library-step-item">
                <span className="library-step-number">1</span>
                <div>
                  <p className="library-step-title">Upload PDF</p>
                  <p className="library-step-description">Add your book file</p>
                </div>
              </div>
              <div className="library-step-item">
                <span className="library-step-number">2</span>
                <div>
                  <p className="library-step-title">AI Processing</p>
                  <p className="library-step-description">We analyze the content</p>
                </div>
              </div>
              <div className="library-step-item">
                <span className="library-step-number">3</span>
                <div>
                  <p className="library-step-title">Voice Chat</p>
                  <p className="library-step-description">Discuss with AI</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="library-hero-illustration">
          <Image
            src="/assets/hero-illustration.png"
            alt="Vintage books and globe illustration"
            width={300}
            height={225}
            className="object-contain"
          />
        </div>
      </section>
  )
}

export default HeroSection