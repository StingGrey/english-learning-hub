"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import {
  Upload,
  BookOpen,
  Trash2,
  Plus,
  PlusCircle,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function WordbookPage() {
  const { data: books, refetch: refetchBooks } = useFetch(
    () => api.vocabBook.list(),
    []
  );

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [bookDetail, setBookDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 生成文章相关
  const [generating, setGenerating] = useState(false);
  const [genDifficulty, setGenDifficulty] = useState("medium");
  const [genTopic, setGenTopic] = useState("");
  const [genIncludeVocab, setGenIncludeVocab] = useState(true);
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // 提取 PDF 文本
  const extractPdfText = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(" ");
      pages.push(text);
    }

    return pages.join("\n\n");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress("正在读取文件...");

    try {
      let text = "";
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "pdf") {
        setUploadProgress("正在解析 PDF...");
        text = await extractPdfText(file);
      } else {
        // TXT / CSV / 其他文本格式
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error("文件内容为空");
      }

      setUploadProgress("AI 正在提取词汇...(可能需要 30-60 秒)");

      const name = file.name.replace(/\.[^/.]+$/, "");
      await api.vocabBook.create({ name, text });

      setUploadProgress("");
      refetchBooks();
    } catch (err: any) {
      alert("上传失败: " + (err.message || "未知错误"));
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleViewBook = async (bookId: number) => {
    if (selectedBookId === bookId) {
      setSelectedBookId(null);
      setBookDetail(null);
      return;
    }
    setSelectedBookId(bookId);
    setLoadingDetail(true);
    const detail = await api.vocabBook.get(bookId);
    setBookDetail(detail);
    setLoadingDetail(false);
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!confirm("确定删除这本词汇书吗？")) return;
    await api.vocabBook.delete(bookId);
    if (selectedBookId === bookId) {
      setSelectedBookId(null);
      setBookDetail(null);
    }
    refetchBooks();
  };

  const handleAddWord = async (wordId: number) => {
    await api.vocabBook.addWordToVocab(wordId);
    if (selectedBookId) {
      const detail = await api.vocabBook.get(selectedBookId);
      setBookDetail(detail);
    }
  };

  const handleAddAllWords = async (bookId: number) => {
    const result = await api.vocabBook.addAllToVocab(bookId);
    alert(`成功添加 ${result.added} 个单词到生词本！`);
    if (selectedBookId) {
      const detail = await api.vocabBook.get(selectedBookId);
      setBookDetail(detail);
    }
  };

  const handleGenerate = async () => {
    if (!selectedBookId && !genIncludeVocab) {
      alert("请选择一本词汇书或勾选包含生词本");
      return;
    }
    setGenerating(true);
    setGeneratedResult(null);
    try {
      const result = await api.vocabBook.generateArticle({
        bookId: selectedBookId || undefined,
        includeVocab: genIncludeVocab,
        difficulty: genDifficulty,
        topic: genTopic || undefined,
      });
      setGeneratedResult(result);
    } catch (err: any) {
      alert("生成失败: " + (err.message || "未知错误"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-8 lg:mb-12">
        <p className="s-label">词汇书</p>
        <h1 className="text-xl md:text-2xl font-black">词汇书管理</h1>
      </div>

      {/* 上传区域 */}
      <div className="s-card mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sans font-bold text-xs md:text-sm uppercase tracking-wider">
            上传词汇书
          </h2>
          <span className="font-mono text-xs text-gray-500">
            支持 TXT / PDF / CSV
          </span>
        </div>

        <div className="relative">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf,.csv,.text"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center border-2 border-dashed border-black py-6 md:py-10 cursor-pointer transition-all ${
              uploading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-50 hover:border-accent"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={24} className="animate-spin mb-3" />
                <p className="font-mono text-sm">{uploadProgress}</p>
              </>
            ) : (
              <>
                <Upload size={24} className="mb-3 text-gray-500" />
                <p className="font-mono text-sm text-gray-500">
                  点击或拖拽文件上传
                </p>
                <p className="font-mono text-xs text-gray-400 mt-1">
                  AI 将自动提取并整理词汇
                </p>
              </>
            )}
          </label>
        </div>
      </div>

      {/* 词汇书列表 */}
      <div className="mb-6 lg:mb-8">
        <h2 className="font-sans font-bold text-xs md:text-sm uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
          我的词汇书 ({books?.length ?? 0})
        </h2>

        {books?.length === 0 ? (
          <div className="s-card text-center py-12">
            <BookOpen size={28} className="mx-auto text-gray-400 mb-3" />
            <p className="font-mono text-sm text-gray-500">
              还没有词汇书，上传一个试试吧～
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {books?.map((book: any) => (
              <div key={book.id}>
                <div className="s-card-hover flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
                  <button
                    onClick={() => handleViewBook(book.id)}
                    className="flex-1 text-left flex items-center gap-3"
                  >
                    <FileText size={18} className="text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-sans font-bold text-sm truncate">
                        {book.name}
                      </p>
                      <p className="font-mono text-xs text-gray-500">
                        {book.word_count} 个单词 ·{" "}
                        {new Date(book.created_at).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    {selectedBookId === book.id ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </button>
                  <div className="flex flex-wrap gap-2 sm:ml-3 flex-shrink-0">
                    <button
                      onClick={() => handleAddAllWords(book.id)}
                      className="s-btn-sm flex items-center gap-1"
                      title="全部添加到生词本"
                    >
                      <PlusCircle size={12} />
                      全部加入
                    </button>
                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      className="p-1.5 border-2 border-black text-gray-500 hover:text-accent hover:border-accent transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 展开的单词列表 */}
                {selectedBookId === book.id && (
                  <div className="border-2 border-t-0 border-black bg-gray-50 p-3 md:p-4">
                    {loadingDetail ? (
                      <p className="font-mono text-xs md:text-sm text-gray-500 text-center py-4">
                        加载中...
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 md:max-h-96 overflow-y-auto overscroll-contain">
                        {bookDetail?.words?.map((w: any) => (
                          <div
                            key={w.id}
                            className="flex items-center gap-2 md:gap-3 p-2 bg-white border-2 border-black"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="font-sans font-bold text-sm">
                                  {w.word}
                                </span>
                                {w.pos && (
                                  <span className="font-mono text-xs text-gray-500 uppercase">
                                    {w.pos}
                                  </span>
                                )}
                                {w.pronunciation && (
                                  <span className="font-mono text-xs text-gray-400">
                                    {w.pronunciation}
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-xs text-gray-600 truncate">
                                {w.definition}
                              </p>
                            </div>
                            {w.is_added_to_vocab ? (
                              <span className="s-tag-accent text-xs flex-shrink-0">
                                已加入
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAddWord(w.id)}
                                className="p-1 border-2 border-black text-gray-500 hover:text-accent hover:border-accent transition-all flex-shrink-0"
                                title="添加到生词本"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI 生成文章 */}
      <div className="s-card">
        <button
          onClick={() => setShowGenPanel(!showGenPanel)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} />
            <h2 className="font-sans font-bold text-sm uppercase tracking-wider">
              AI 生成文章
            </h2>
          </div>
          {showGenPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showGenPanel && (
          <div className="mt-6 space-y-3 md:space-y-4">
            <p className="font-mono text-xs text-gray-500">
              根据词汇书和生词本中的单词，AI 生成一篇包含这些词汇的真实性非虚构文章。
            </p>

            {/* 词汇来源 */}
            <div>
              <label className="s-label">词汇来源</label>
              <div className="space-y-2">
                {selectedBookId && bookDetail ? (
                  <div className="flex items-center gap-2 p-2 border-2 border-black bg-gray-50">
                    <FileText size={14} />
                    <span className="font-mono text-xs md:text-sm flex-1 truncate">
                      词汇书: {bookDetail.name} ({bookDetail.word_count} 词)
                    </span>
                  </div>
                ) : (
                  <p className="font-mono text-xs text-gray-400">
                    从上方选择一本词汇书（点击展开）
                  </p>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genIncludeVocab}
                    onChange={(e) => setGenIncludeVocab(e.target.checked)}
                    className="accent-accent"
                  />
                  <span className="font-mono text-xs md:text-sm">同时包含生词本单词</span>
                </label>
              </div>
            </div>

            {/* 难度选择 */}
            <div>
              <label className="s-label">文章难度</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "easy", label: "简单" },
                  { value: "medium", label: "中等" },
                  { value: "hard", label: "困难" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGenDifficulty(opt.value)}
                    className={`py-2 font-sans font-bold text-xs uppercase tracking-wider border-2 border-black transition-all ${
                      genDifficulty === opt.value
                        ? "bg-black text-white"
                        : "bg-white text-gray-500 hover:text-black"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 主题 */}
            <div>
              <label className="s-label">主题方向（可选）</label>
              <input
                type="text"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder="如：科技、环保、教育、健康..."
                className="s-input"
              />
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="s-btn flex items-center gap-2 w-full justify-center"
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  AI 正在生成文章...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  生成文章
                </>
              )}
            </button>

            {/* 生成结果 */}
            {generatedResult && (
              <div className="border-2 border-black p-3 md:p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-sans font-bold text-xs md:text-sm">
                    {generatedResult.title}
                  </h3>
                  <span className="font-mono text-xs text-gray-500">
                    {generatedResult.word_count} 词
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {generatedResult.sentences?.slice(0, 5).map((s: any, i: number) => (
                    <p key={i} className="font-mono text-xs text-gray-600">
                      {s.text_en}
                    </p>
                  ))}
                  {generatedResult.sentences?.length > 5 && (
                    <p className="font-mono text-xs text-gray-400">
                      ... 共 {generatedResult.sentences.length} 个句子
                    </p>
                  )}
                </div>
                <Link
                  href={`/reader?id=${generatedResult.article_id}`}
                  className="s-btn inline-flex items-center gap-2"
                >
                  <BookOpen size={14} />
                  去阅读器查看
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
