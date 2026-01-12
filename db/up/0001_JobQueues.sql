IF OBJECT_ID(N'[MyApp].[JobQueue]', N'U') IS NULL
BEGIN

  CREATE TABLE [MyApp].[JobQueue]
  (
    [QueueID] VARCHAR(255) NOT NULL, -- aka Command name
    [TrackingID] UNIQUEIDENTIFIER PRIMARY KEY, -- pk tracking number
    [WorkCommandJson] VARCHAR(MAX) NOT NULL DEFAULT ('{}'), -- serialized work request details
    [WorkResultJson] VARCHAR(MAX)  NOT NULL DEFAULT ('{}'), -- work result details
    [WorkLogJsonLines] VARCHAR(MAX) NOT NULL DEFAULT '', -- line separated json log
    [Tries] INT NOT NULL DEFAULT (0), -- number of tries made.
    [ExecuteAfter] DATETIME NOT NULL, -- when to start the task
    [ExpireOn] DATETIME NOT NULL, -- when to give up on the task
    [IsComplete] BIT NOT NULL, -- IsComplete Flag
    [IsCancelled] BIT NOT NULL, -- IsCancelled Flag
    [StartedOn] DATETIME NULL, -- if/when the task started running
    [FinishedOn] DATETIME NULL, -- if/when the task finished
    [CreatedOn] DATETIME NOT NULL DEFAULT (SYSUTCDATETIME()), -- when the record was created
    [CreatedByUserId] VARCHAR(100) NOT NULL DEFAULT ('SYSTEM'), -- who created the record
    [CreatedByDisplayName] VARCHAR(255) NOT NULL DEFAULT ('System'), -- who created the record
  );
  CREATE INDEX [idxMyAppJobQueue_QueueId] ON [MyApp].[JobQueue]([QueueID], [ExecuteAfter], [StartedOn]);

END
GO




IF OBJECT_ID(N'[MyApp].[JobHistory]', N'U') IS NULL
BEGIN

  -- move dfrom JobQueue to JobHistory after completion
  CREATE TABLE [MyApp].[JobHistory]
  (
    [QueueID] VARCHAR(255) NOT NULL, -- aka Command name
    [TrackingID] UNIQUEIDENTIFIER PRIMARY KEY, -- pk tracking number
    [WorkCommandJson] VARCHAR(MAX) NOT NULL DEFAULT ('{}'), -- serialized work request details
    [WorkResultJson] VARCHAR(MAX)  NOT NULL DEFAULT ('{}'), -- work result details
    [WorkLogJsonLines] VARCHAR(MAX) NOT NULL DEFAULT '', -- line separated json log
    [Tries] INT NOT NULL DEFAULT (0), -- number of tries made.
    [ExecuteAfter] DATETIME NOT NULL, -- when to start the task
    [ExpireOn] DATETIME NOT NULL, -- when to give up on the task
    [IsComplete] BIT NOT NULL, -- IsComplete Flag    
    [IsCancelled] BIT NOT NULL, -- IsCancelled Flag
    [StartedOn] DATETIME NULL, -- if/when the task started running
    [FinishedOn] DATETIME NULL, -- if/when the task finished
    [CreatedOn] DATETIME NOT NULL DEFAULT (SYSUTCDATETIME()), -- when the record was created
    [CreatedByUserId] VARCHAR(100) NOT NULL DEFAULT ('SYSTEM'), -- who created the record
    [CreatedByDisplayName] VARCHAR(255) NOT NULL DEFAULT ('System'), -- who created the record
  );
  CREATE INDEX [idxMyAppJobHistory_QueueId] ON [MyApp].[JobHistory]([QueueID], [ExecuteAfter], [StartedOn]);
  CREATE INDEX [idxMyAppJobHistory_UserId] ON [MyApp].[JobHistory]([CreatedByUserId], [QueueID]);

END
GO

