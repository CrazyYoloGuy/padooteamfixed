-- SQL command to create the announcements table
-- Run this command in your PostgreSQL database

CREATE TABLE public.announcements (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    importance VARCHAR(10) NOT NULL CHECK (importance IN ('high', 'medium', 'low')),
    created_by UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_announcements_importance ON public.announcements(importance);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);

-- Insert some sample data (optional)
INSERT INTO public.announcements (message, importance, created_at) VALUES
('System maintenance will be performed this weekend. Please expect brief service interruptions.', 'high', NOW() - INTERVAL '2 days'),
('New features have been added to the platform. Check out the updated interface!', 'medium', NOW() - INTERVAL '1 day'),
('Holiday schedule update: Customer support will have limited hours during the holiday season.', 'low', NOW() - INTERVAL '3 hours');
