import ArticleEditorView from '@/components/admin/ArticleEditorView';

type Params = Promise<{ id: string }>;

export default async function AdminArticleEditorPage({ params }: { params: Params }) {
  const { id } = await params;
  return <ArticleEditorView id={id} />;
}
