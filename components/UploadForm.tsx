'use client';

import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, ImageIcon, X } from 'lucide-react';
import { UploadSchema } from '@/lib/zod';
import { voiceOptions, voiceCategories, DEFAULT_VOICE } from '@/lib/constants';
import { cn, parsePDFFile } from '@/lib/utils';
import LoadingOverlay from '@/components/LoadingOverlay';
import type { BookUploadFormValues } from '@/types';
import { useAuth } from '@clerk/nextjs';
import {toast} from 'sonner'
import { checkBookExists, createBook, saveBookSegments } from '@/lib/actions/book.actions';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const {userId} = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookUploadFormValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: {
      title: '',
      author: '',
      voice: '',
      pdfFile: undefined,
      coverImage: undefined
    },
  });

  const pdfDocument = watch('pdfFile');
  const coverImage = watch('coverImage');
  const selectedVoice = watch('voice');

  const onSubmit = async (data: BookUploadFormValues) => {
    if(!userId){
      return toast.error('Please login to upload books')
    }
    setIsSubmitting(true);
    try {
      const existsCheck = await checkBookExists(data.title)
      if(existsCheck.exists && existsCheck.book){
        toast.info('Book with same title already exists')
        router.push(`/books/${existsCheck.book.slug}`)
        return
      }
      const fileTitle = data.title.replace(/\s+/g, '-').toLowerCase()
      const pdfFile = data.pdfFile
      const parsedPDF = await parsePDFFile(pdfFile)
      if(parsedPDF.content.length === 0){
        toast.error('Failed to parse PDF. Please try again with a different file')
        return
      }
      const uploadedPDFBlob = await upload(fileTitle, pdfFile, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        contentType: 'application/pdf'
      })
      let coverUrl: string
      if(data.coverImage){
        const coverFile = data.coverImage
        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, coverFile, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          contentType: coverFile.type
        })
        coverUrl = uploadedCoverBlob.url
      }else{
        const response = await fetch(parsedPDF.cover)
        const blob = await response.blob()
        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          contentType: 'image/png'
        })
        coverUrl = uploadedCoverBlob.url
      }
      const book = await createBook({
        clerkId: userId,
        title: data.title,
        author: data.author,
        persona: data.voice,
        fileURL: uploadedPDFBlob.url,
        fileBlobKey: uploadedPDFBlob.pathname,
        coverURL: coverUrl,
        fileSize: pdfFile.size
      })
      if(!book.success) throw new Error('Failed to create book')
      if(book.alreadyExists){
        toast.info('Book with same title already exists')
        router.push(`/books/${existsCheck.book.slug}`)
        return
      }
      const segments = await saveBookSegments(book.data._id, userId, parsedPDF.content)
      if(!segments.success){
        toast.error('Failed to save book segments')
        throw new Error('Failed to save book segments')
      }
      router.push('/')
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload book. Please try again later')
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('pdfFile', file, { shouldValidate: true });
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('coverImage', file, { shouldValidate: true });
    }
  };

  const removePdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue('pdfFile', undefined as unknown as File, { shouldValidate: true });
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const removeCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue('coverImage', undefined, { shouldValidate: true });
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <form onSubmit={handleSubmit(onSubmit)} className="new-book-wrapper">
        <div className="space-y-8">
          {/* PDF Upload */}
          <div>
            <label className="form-label">Book PDF File</label>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfSelect}
              className="hidden"
            />
            <div
              onClick={() => pdfInputRef.current?.click()}
              className={cn(
                'upload-dropzone border-2 border-dashed border-[var(--border-medium)]',
                pdfDocument && 'upload-dropzone-uploaded'
              )}
            >
              {pdfDocument ? (
                <div className="flex items-center gap-3">
                  <Upload className="upload-dropzone-icon !mb-0 !w-6 !h-6" />
                  <span className="upload-dropzone-text">{pdfDocument.name}</span>
                  <button type="button" onClick={removePdf} className="upload-dropzone-remove">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="upload-dropzone-icon" />
                  <span className="upload-dropzone-text">Click to upload PDF</span>
                  <span className="upload-dropzone-hint">PDF file (max 50MB)</span>
                </>
              )}
            </div>
            {errors.pdfFile && (
              <p className="text-sm text-red-500 mt-1">{errors.pdfFile.message}</p>
            )}
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="form-label">Cover Image (Optional)</label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverSelect}
              className="hidden"
            />
            <div
              onClick={() => coverInputRef.current?.click()}
              className={cn(
                'upload-dropzone border-2 border-dashed border-[var(--border-medium)]',
                coverImage && 'upload-dropzone-uploaded'
              )}
            >
              {coverImage ? (
                <div className="flex items-center gap-3">
                  <ImageIcon className="upload-dropzone-icon !mb-0 !w-6 !h-6" />
                  <span className="upload-dropzone-text">{coverImage.name}</span>
                  <button type="button" onClick={removeCover} className="upload-dropzone-remove">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon className="upload-dropzone-icon" />
                  <span className="upload-dropzone-text">Click to upload cover image</span>
                  <span className="upload-dropzone-hint">Leave empty to auto-generate from PDF</span>
                </>
              )}
            </div>
            {errors.coverImage && (
              <p className="text-sm text-red-500 mt-1">{errors.coverImage.message}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="form-label">Title</label>
            <input
              {...register('title')}
              placeholder="ex: Rich Dad Poor Dad"
              className="form-input"
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Author */}
          <div>
            <label className="form-label">Author Name</label>
            <input
              {...register('author')}
              placeholder="ex: Robert Kiyosaki"
              className="form-input"
            />
            {errors.author && (
              <p className="text-sm text-red-500 mt-1">{errors.author.message}</p>
            )}
          </div>

          {/* Voice Selector */}
          <div>
            <label className="form-label">Choose Assistant Voice</label>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Male Voices</p>
                <div className="voice-selector-options">
                  {voiceCategories.male.map((key) => {
                    const voice = voiceOptions[key as keyof typeof voiceOptions];
                    return (
                      <label
                        key={key}
                        className={cn(
                          'voice-selector-option',
                          selectedVoice === key
                            ? 'voice-selector-option-selected'
                            : 'voice-selector-option-default'
                        )}
                      >
                        <input
                          type="radio"
                          {...register('voice')}
                          value={key}
                          className="accent-[#663820]"
                        />
                        <div>
                          <p className="font-bold text-[var(--text-primary)]">{voice.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{voice.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Female Voices</p>
                <div className="voice-selector-options">
                  {voiceCategories.female.map((key) => {
                    const voice = voiceOptions[key as keyof typeof voiceOptions];
                    return (
                      <label
                        key={key}
                        className={cn(
                          'voice-selector-option',
                          selectedVoice === key
                            ? 'voice-selector-option-selected'
                            : 'voice-selector-option-default'
                        )}
                      >
                        <input
                          type="radio"
                          {...register('voice')}
                          value={key}
                          className="accent-[#663820]"
                        />
                        <div>
                          <p className="font-bold text-[var(--text-primary)]">{voice.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{voice.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            {errors.voice && (
              <p className="text-sm text-red-500 mt-1">{errors.voice.message}</p>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting} className="form-btn">
            Begin Synthesis
          </button>
        </div>
      </form>
    </>
  );
};

export default UploadForm;
