/*
  # Allow users to create buffalo balances

  1. Changes
    - Add policy to allow authenticated users to insert buffalo_balances
    - This enables users to accept buffalo requests and create the corresponding balance records
    
  2. Security
    - Users can only insert balances where they are the recipient
    - This ensures users can only accept buffalos on themselves, not on others
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'buffalo_balances' 
    AND policyname = 'Users can create buffalo balances when accepting requests'
  ) THEN
    CREATE POLICY "Users can create buffalo balances when accepting requests"
      ON buffalo_balances
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = recipient_id
      );
  END IF;
END $$;
