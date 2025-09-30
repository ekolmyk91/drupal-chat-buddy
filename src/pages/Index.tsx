import ChatPopup from '@/components/ChatPopup';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-2xl px-4">
        <h1 className="mb-4 text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Admin Chat Assistant
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Your AI-powered assistant is ready to help. Click the chat button to get started!
        </p>
        <div className="bg-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold mb-2">Quick Setup</h2>
          <p className="text-sm text-muted-foreground">
            Update the <code className="bg-secondary px-2 py-1 rounded">N8N_ENDPOINT</code> in{' '}
            <code className="bg-secondary px-2 py-1 rounded">ChatPopup.tsx</code> with your n8n webhook URL.
          </p>
        </div>
      </div>
      <ChatPopup />
    </div>
  );
};

export default Index;
