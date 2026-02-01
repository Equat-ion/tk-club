-- Migration to create tasks and task_columns tables for kanban board
-- Tasks can be organized by columns (Not Started, In Progress, Done)
-- Tasks can be linked to events or exist independently within a team

BEGIN;

-- Create task_columns table for customizable kanban columns
CREATE TABLE IF NOT EXISTS task_columns (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, order_index)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES task_columns(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  description TEXT CHECK (char_length(description) <= 2000),
  
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'high')),
  due_at TIMESTAMPTZ,
  
  order_index INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_task_columns_event_id ON task_columns(event_id);
CREATE INDEX idx_task_columns_order ON task_columns(event_id, order_index);
CREATE INDEX idx_tasks_event_id ON tasks(event_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX idx_tasks_order ON tasks(column_id, order_index);

-- Enable RLS
ALTER TABLE task_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_columns
-- Users can view columns for their events
CREATE POLICY "Users can view their event columns"
  ON task_columns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = task_columns.event_id
        AND events.organizer_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
  );

-- Users can create columns for their events
CREATE POLICY "Users can create columns for their events"
  ON task_columns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = task_columns.event_id
        AND events.organizer_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
  );

-- Users can update their event columns
CREATE POLICY "Users can update their event columns"
  ON task_columns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = task_columns.event_id
        AND events.organizer_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
  );

-- Users can delete their event columns
CREATE POLICY "Users can delete their event columns"
  ON task_columns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = task_columns.event_id
        AND events.organizer_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
  );

-- RLS Policies for tasks
-- Users can view tasks for their events
CREATE POLICY "Users can view their event tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tasks.event_id
        AND events.organizer_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
  );

-- Users can create tasks for their events
CREATE POLICY "Users can create tasks for their events"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tasks.event_id
        AND events.organizer_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
  );

-- Users can update their event tasks
CREATE POLICY "Users can update their event tasks"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tasks.event_id
        AND events.organizer_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
  );

-- Users can delete their event tasks
CREATE POLICY "Users can delete their event tasks"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tasks.event_id
        AND events.organizer_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
  );

-- Trigger to update updated_at timestamp for task_columns
CREATE OR REPLACE FUNCTION update_task_columns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_columns_updated_at
  BEFORE UPDATE ON task_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_task_columns_updated_at();

-- Trigger to update updated_at timestamp for tasks
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Function to create default task columns for a new event
CREATE OR REPLACE FUNCTION create_default_task_columns_for_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default columns: Not Started, In Progress, Done
  INSERT INTO task_columns (event_id, name, order_index)
  VALUES 
    (NEW.id, 'Not Started', 0),
    (NEW.id, 'In Progress', 1),
    (NEW.id, 'Done', 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create default columns when event is created
CREATE TRIGGER trigger_create_default_task_columns
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_default_task_columns_for_event();

-- Create default columns for existing events
INSERT INTO task_columns (event_id, name, order_index)
SELECT 
  id,
  'Not Started',
  0
FROM events
WHERE NOT EXISTS (
  SELECT 1 FROM task_columns WHERE task_columns.event_id = events.id
);

INSERT INTO task_columns (event_id, name, order_index)
SELECT 
  id,
  'In Progress',
  1
FROM events
WHERE NOT EXISTS (
  SELECT 1 FROM task_columns WHERE task_columns.event_id = events.id AND task_columns.order_index = 1
);

INSERT INTO task_columns (event_id, name, order_index)
SELECT 
  id,
  'Done',
  2
FROM events
WHERE NOT EXISTS (
  SELECT 1 FROM task_columns WHERE task_columns.event_id = events.id AND task_columns.order_index = 2
);

COMMIT;
