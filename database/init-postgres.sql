-- Schema for the Microbanking System. Run through setup.sql, which creates and connects to the database.

CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE contact_type AS ENUM ('customer', 'employee', 'branch');
CREATE TYPE account_status_type AS ENUM ('Active', 'Closed');
CREATE TYPE plan_type AS ENUM ('Children', 'Teen', 'Adult', 'Senior', 'Joint');
CREATE TYPE auto_renewal_status_type AS ENUM ('True', 'False');
CREATE TYPE fd_status_type AS ENUM ('Active', 'Matured', 'Closed');
CREATE TYPE employee_role AS ENUM ('Manager', 'Agent', 'Admin');
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'employee_status_type'
    ) THEN
        CREATE TYPE employee_status_type AS ENUM ('Active', 'Inactive');
    END IF;
END $$;
CREATE TYPE fd_options_type AS ENUM ('6 months', '1 year', '3 years');
CREATE TYPE transaction_type AS ENUM ('Deposit', 'Withdrawal', 'Interest');

CREATE TABLE IF NOT EXISTS Contact (
    contact_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    type contact_type NOT NULL,
    contact_no_1 VARCHAR(15),
    contact_no_2 VARCHAR(15),
    address VARCHAR(100),
    email VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_contact_phone_1 CHECK (contact_no_1 ~ '^[+]?[0-9]{9,14}$'),
    CONSTRAINT chk_contact_phone_2 CHECK (contact_no_2 IS NULL OR contact_no_2 ~ '^[+]?[0-9]{9,14}$'),
    CONSTRAINT chk_contact_email CHECK (email IS NULL OR email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')
);

CREATE TABLE IF NOT EXISTS Branch (
    branch_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(50) NOT NULL,
    contact_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES Contact(contact_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS FDPlan (
    fd_plan_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    fd_options fd_options_type NOT NULL UNIQUE,
    interest DECIMAL(5,2) NOT NULL CHECK (interest > 0 AND interest <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS SavingPlan (
    saving_plan_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    plan_type plan_type NOT NULL UNIQUE,
    interest DECIMAL(5,2) NOT NULL CHECK (interest >= 0 AND interest <= 100),
    min_balance DECIMAL(10,2) NOT NULL CHECK (min_balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS FixedDeposit (
    fd_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    fd_balance DECIMAL(15,2) NOT NULL,
    auto_renewal_status auto_renewal_status_type NOT NULL,
    fd_status fd_status_type NOT NULL,
    open_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    fd_plan_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fd_plan_id) REFERENCES FDPlan(fd_plan_id) ON DELETE RESTRICT,
    CONSTRAINT chk_fd_balance_positive CHECK (fd_balance > 0),
    CONSTRAINT chk_fd_dates CHECK (maturity_date > open_date)
);

CREATE TABLE IF NOT EXISTS Employee (
    employee_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    role employee_role NOT NULL,
    username VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    nic VARCHAR(15) NOT NULL,
    gender gender_type NOT NULL,
    date_of_birth DATE NOT NULL,
    branch_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    employee_status employee_status_type NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES Branch(branch_id) ON DELETE RESTRICT,
    FOREIGN KEY (contact_id) REFERENCES Contact(contact_id) ON DELETE RESTRICT,
    -- NIC: 12 digits, or 9 digits + 'V'
    CONSTRAINT chk_employee_nic_format CHECK (
        nic ~ '^[0-9]{12}$' OR nic ~ '^[0-9]{9}V$'
    )
);

-- Trigger rather than CHECK so existing rows don't block this script
CREATE OR REPLACE FUNCTION enforce_employee_min_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_of_birth IS NULL THEN
        RAISE EXCEPTION 'Employee date_of_birth is required';
    END IF;
    IF age(current_date, NEW.date_of_birth) < interval '18 years' THEN
        RAISE EXCEPTION 'Employee must be at least 18 years old';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE proc_deactivate_employee(
    p_employee_id INTEGER,
    p_actor_employee_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    IF p_employee_id = p_actor_employee_id THEN
        RAISE EXCEPTION 'You cannot deactivate your own account.' USING ERRCODE = '22023';
    END IF;

    SELECT TRUE INTO v_exists FROM employee WHERE employee_id = p_employee_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee % not found', p_employee_id USING ERRCODE = '02000';
    END IF;

    UPDATE employee SET employee_status = 'Inactive' WHERE employee_id = p_employee_id;
END;
$$;

CREATE OR REPLACE PROCEDURE proc_activate_employee(
    p_employee_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT TRUE INTO v_exists FROM employee WHERE employee_id = p_employee_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee % not found', p_employee_id USING ERRCODE = '02000';
    END IF;

    UPDATE employee SET employee_status = 'Active' WHERE employee_id = p_employee_id;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE event_object_table = 'employee' AND trigger_name = 'trg_employee_min_age'
    ) THEN
        DROP TRIGGER trg_employee_min_age ON employee;
    END IF;
END $$;

CREATE TRIGGER trg_employee_min_age
BEFORE INSERT OR UPDATE OF date_of_birth ON employee
FOR EACH ROW
EXECUTE FUNCTION enforce_employee_min_age();

CREATE TABLE IF NOT EXISTS Customer (
    customer_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender gender_type NOT NULL,
    nic VARCHAR(30) NOT NULL,
    date_of_birth DATE NOT NULL,
    contact_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES Contact(contact_id) ON DELETE RESTRICT,
    -- NIC or birth certificate no.: 12 digits, or 9 digits + 'V'
    CONSTRAINT chk_customer_nic_or_bc_format CHECK (
        nic ~ '^[0-9]{12}$' OR nic ~ '^[0-9]{9}V$'
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_nic ON customer (nic);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_employee_nic ON employee (nic);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_branch_name ON branch (LOWER(name));

CREATE TABLE IF NOT EXISTS Account (
    account_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    open_date DATE NOT NULL,
    account_status account_status_type NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    saving_plan_id INTEGER,
    fd_id INTEGER,
    branch_id INTEGER NOT NULL,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (saving_plan_id) REFERENCES SavingPlan(saving_plan_id) ON DELETE SET NULL,
    FOREIGN KEY (fd_id) REFERENCES FixedDeposit(fd_id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES Branch(branch_id) ON DELETE RESTRICT,
    CONSTRAINT chk_account_balance_non_negative CHECK (balance >= 0)
);

-- Upgrades for databases created by older versions of this script
ALTER TABLE account ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'employee_status_type'
    ) THEN
        CREATE TYPE employee_status_type AS ENUM ('Active', 'Inactive');
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee' AND column_name = 'employee_status'
    ) THEN
        EXECUTE 'ALTER TABLE employee ADD COLUMN employee_status employee_status_type NOT NULL DEFAULT ''Active'' ';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer' AND column_name = 'nic' AND character_maximum_length = 15
    ) THEN
        EXECUTE 'ALTER TABLE customer ALTER COLUMN nic TYPE VARCHAR(30)';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employee' AND column_name = 'nic' AND character_maximum_length = 15
    ) THEN
        EXECUTE 'ALTER TABLE employee ALTER COLUMN nic TYPE VARCHAR(30)';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS Transaction (
    transaction_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    time TIMESTAMP NOT NULL,
    description VARCHAR(100),
    account_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES Account(account_id) ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE RESTRICT,
    CONSTRAINT chk_transaction_amount_positive CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS Takes (
    takes_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES Account(account_id) ON DELETE CASCADE,
    UNIQUE(customer_id, account_id)
);

CREATE TABLE IF NOT EXISTS fd_interest_calculations (
    id SERIAL PRIMARY KEY,
    fd_id INTEGER NOT NULL,
    calculation_date DATE NOT NULL,
    interest_amount DECIMAL(15,2) NOT NULL,
    days_in_period INTEGER NOT NULL,
    credited_to_account_id INTEGER NOT NULL,
    credited_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fd_id) REFERENCES FixedDeposit(fd_id) ON DELETE CASCADE,
    FOREIGN KEY (credited_to_account_id) REFERENCES Account(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings_interest_calculations (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    calculation_date DATE NOT NULL,
    interest_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    plan_type VARCHAR(20) NOT NULL,
    credited_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES Account(account_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS fd_interest_periods CASCADE;
DROP TABLE IF EXISTS savings_interest_periods CASCADE;

CREATE TABLE IF NOT EXISTS transaction_audit_log (
    audit_id SERIAL PRIMARY KEY,
    transaction_type transaction_type,
    amount DECIMAL(12,2),
    attempted_time TIMESTAMP,
    description VARCHAR(100),
    account_id INTEGER,
    employee_id INTEGER,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_plan_change_audit (
    audit_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    old_saving_plan_id INTEGER NOT NULL,
    new_saving_plan_id INTEGER NOT NULL,
    reason TEXT,
    changed_by_employee_id INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES Account(account_id) ON DELETE CASCADE,
    FOREIGN KEY (old_saving_plan_id) REFERENCES SavingPlan(saving_plan_id) ON DELETE RESTRICT,
    FOREIGN KEY (new_saving_plan_id) REFERENCES SavingPlan(saving_plan_id) ON DELETE RESTRICT,
    FOREIGN KEY (changed_by_employee_id) REFERENCES Employee(employee_id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION update_account_balance(
    p_account_id INTEGER,
    p_amount DECIMAL(15,2),
    p_transaction_type transaction_type
) RETURNS DECIMAL(15,2) AS $$
DECLARE
    current_balance DECIMAL(15,2);
    new_balance DECIMAL(15,2);
    min_balance_threshold DECIMAL(15,2);
BEGIN
    -- Lets trigger_account_balance_guard allow this update
    PERFORM set_config('app.balance_update_allowed', 'true', true);
    PERFORM set_config('app.balance_update_account_id', p_account_id::text, true);

    SELECT a.balance, sp.min_balance 
    INTO current_balance, min_balance_threshold
    FROM account a
    JOIN savingplan sp ON a.saving_plan_id = sp.saving_plan_id
    WHERE a.account_id = p_account_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found: %', p_account_id;
    END IF;
    
    -- Treat Interest credits as Deposits
    IF p_transaction_type = 'Deposit' OR p_transaction_type = 'Interest' THEN
        new_balance := current_balance + p_amount;
    ELSIF p_transaction_type = 'Withdrawal' THEN
        new_balance := current_balance - p_amount;
        
        IF new_balance < min_balance_threshold THEN
            RAISE EXCEPTION 'Insufficient balance. Minimum balance required: %', min_balance_threshold;
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
    END IF;
    
    UPDATE account SET balance = new_balance WHERE account_id = p_account_id;
    
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_transaction_with_validation(
    p_transaction_type transaction_type,
    p_amount DECIMAL(12,2),
    p_description VARCHAR(100),
    p_account_id INTEGER,
    p_employee_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_transaction_id INTEGER;
BEGIN
    -- Validation and balance update happen in the BEFORE INSERT trigger on transaction
    INSERT INTO transaction (
        transaction_type, amount, time, description, account_id, employee_id
    ) VALUES (
        p_transaction_type, p_amount, CURRENT_TIMESTAMP, p_description, p_account_id, p_employee_id
    ) RETURNING transaction_id INTO v_transaction_id;
    
    RETURN v_transaction_id;
EXCEPTION
    WHEN others THEN
        RAISE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_matured_fixed_deposits() 
RETURNS TABLE(
    processed_count INTEGER,
    total_principal_returned DECIMAL(15,2)
) AS $$
DECLARE
    matured_record RECORD;
    v_processed_count INTEGER := 0;
    v_total_principal DECIMAL(15,2) := 0;
BEGIN
    FOR matured_record IN 
        SELECT 
            fd.fd_id,
            fd.fd_balance as principal_amount,
            fd.auto_renewal_status,
            a.account_id as linked_account_id,
            fp.fd_options
        FROM fixeddeposit fd
        JOIN account a ON fd.fd_id = a.fd_id
        JOIN fdplan fp ON fd.fd_plan_id = fp.fd_plan_id
        WHERE fd.fd_status = 'Active' 
          AND fd.maturity_date <= CURRENT_DATE
    LOOP
        BEGIN
            -- If auto-renewal is True, only roll the dates forward (no principal returned)
            IF matured_record.auto_renewal_status = 'True' THEN
                UPDATE fixeddeposit 
                SET 
                    open_date = CURRENT_DATE,
                    maturity_date = CURRENT_DATE + 
                        CASE matured_record.fd_options
                            WHEN '6 months' THEN INTERVAL '6 months'
                            WHEN '1 year' THEN INTERVAL '1 year'
                            WHEN '3 years' THEN INTERVAL '3 years'
                        END
                WHERE fd_id = matured_record.fd_id;
            ELSE
                PERFORM create_transaction_with_validation(
                    'Deposit', 
                    matured_record.principal_amount, 
                    'FD Maturity Principal Return', 
                    matured_record.linked_account_id, 
                    1 -- system/admin employee id
                );

                UPDATE fixeddeposit SET fd_status = 'Closed' WHERE fd_id = matured_record.fd_id;
                UPDATE account SET fd_id = NULL WHERE fd_id = matured_record.fd_id;

                v_total_principal := v_total_principal + matured_record.principal_amount;
            END IF;

            v_processed_count := v_processed_count + 1;
            
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Failed to process matured FD %: %', matured_record.fd_id, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_processed_count, v_total_principal;
END;
$$ LANGUAGE plpgsql;

-- p_cycle: time between interest credits (production: 30 days; the API passes INTEREST_CYCLE)
CREATE OR REPLACE FUNCTION calculate_fd_interest_due(
    p_cycle INTERVAL DEFAULT INTERVAL '30 days'
) RETURNS TABLE(
    fd_id INTEGER,
    principal_amount DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    interest_amount DECIMAL(15,2),
    days_in_period INTEGER,
    linked_account_id INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fd.fd_id,
        fd.fd_balance AS principal_amount,
        fp.interest AS interest_rate,
        ROUND((fd.fd_balance * (fp.interest/100) * (30.0/365.0))::NUMERIC, 2) AS interest_amount,
        30 AS days_in_period,
        a.account_id AS linked_account_id
    FROM fixeddeposit fd
    JOIN fdplan fp ON fd.fd_plan_id = fp.fd_plan_id
    JOIN account a ON fd.fd_id = a.fd_id
    LEFT JOIN LATERAL (
        SELECT MAX(fic.calculation_date) AS last_credited_date
        FROM fd_interest_calculations fic
        WHERE fic.fd_id = fd.fd_id AND fic.status = 'credited'
    ) last_fd ON TRUE
    WHERE fd.fd_status = 'Active'
      AND a.account_status = 'Active'
      AND CURRENT_TIMESTAMP >= COALESCE(
          (SELECT MAX(fic2.credited_at) FROM fd_interest_calculations fic2 WHERE fic2.fd_id = fd.fd_id AND fic2.status = 'credited'),
          fd.open_date::TIMESTAMP
      ) + p_cycle;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_savings_interest_due(
    p_cycle INTERVAL DEFAULT INTERVAL '30 days'
) RETURNS TABLE(
    account_id INTEGER,
    balance DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    interest_amount DECIMAL(15,2),
    plan_type VARCHAR(20),
    min_balance DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.account_id,
        a.balance,
        sp.interest AS interest_rate,
        ROUND((a.balance * (sp.interest/100) * (30.0/365.0))::NUMERIC, 2) AS interest_amount,
        sp.plan_type::VARCHAR,
        sp.min_balance
    FROM account a
    JOIN savingplan sp ON a.saving_plan_id = sp.saving_plan_id
    LEFT JOIN LATERAL (
        SELECT MAX(sic.calculation_date) AS last_credited_date
        FROM savings_interest_calculations sic
        WHERE sic.account_id = a.account_id AND sic.status = 'credited'
    ) last_s ON TRUE
    WHERE a.account_status = 'Active'
      AND a.fd_id IS NULL
      AND a.balance >= sp.min_balance
      AND CURRENT_TIMESTAMP >= COALESCE(
          (SELECT MAX(sic2.credited_at) FROM savings_interest_calculations sic2 WHERE sic2.account_id = a.account_id AND sic2.status = 'credited'),
          a.open_date::TIMESTAMP
      ) + p_cycle;
END;
$$ LANGUAGE plpgsql;

-- Guard: Block direct balance updates unless allowed via session flags
CREATE OR REPLACE FUNCTION guard_direct_account_balance_update() RETURNS TRIGGER AS $$
DECLARE
    v_allowed TEXT;
    v_account_id TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.balance IS DISTINCT FROM OLD.balance THEN
        v_allowed := current_setting('app.balance_update_allowed', true);
        v_account_id := current_setting('app.balance_update_account_id', true);
        IF NOT (v_allowed = 'true' AND v_account_id = NEW.account_id::text) THEN
            RAISE EXCEPTION 'Direct balance update is not allowed. Use the transaction function.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_account_balance_guard ON account;
CREATE TRIGGER trigger_account_balance_guard
    BEFORE UPDATE ON account
    FOR EACH ROW
    EXECUTE FUNCTION guard_direct_account_balance_update();

CREATE OR REPLACE FUNCTION check_account_status() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Account balance cannot be negative';
    END IF;

    -- Saving plan can only change when the session flag allows it for this account
    IF TG_OP = 'UPDATE' AND NEW.saving_plan_id IS DISTINCT FROM OLD.saving_plan_id THEN
        IF NOT (
            current_setting('app.plan_change_allowed', true) = 'true' AND 
            current_setting('app.plan_change_account_id', true) = NEW.account_id::text
        ) THEN
            RAISE EXCEPTION 'Changing account plan is not allowed';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_account_status ON account;
CREATE TRIGGER trigger_account_status
    BEFORE INSERT OR UPDATE OF balance, saving_plan_id ON account
    FOR EACH ROW
    EXECUTE FUNCTION check_account_status();

CREATE OR REPLACE FUNCTION change_account_saving_plan(
    p_account_id INTEGER,
    p_new_saving_plan_id INTEGER,
    p_actor_employee_id INTEGER,
    p_reason TEXT,
    p_new_nic TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_old_plan_id INTEGER;
    v_old_plan_type plan_type;
    v_new_plan_type plan_type;
    v_account_status account_status_type;
    v_balance DECIMAL(15,2);
    v_min_balance_new DECIMAL(10,2);
    v_customer_id INTEGER;
    v_dob DATE;
    v_age_years INTEGER;
BEGIN
    SELECT a.saving_plan_id, a.account_status, a.balance
    INTO v_old_plan_id, v_account_status, v_balance
    FROM account a
    WHERE a.account_id = p_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found: %', p_account_id;
    END IF;

    IF v_account_status <> 'Active' THEN
        RAISE EXCEPTION 'Plan change only allowed for Active accounts';
    END IF;

    IF v_old_plan_id IS NULL THEN
        RAISE EXCEPTION 'Account has no saving plan assigned';
    END IF;

    SELECT sp.plan_type INTO v_old_plan_type FROM savingplan sp WHERE sp.saving_plan_id = v_old_plan_id;
    SELECT sp.plan_type, sp.min_balance INTO v_new_plan_type, v_min_balance_new FROM savingplan sp WHERE sp.saving_plan_id = p_new_saving_plan_id;

    IF v_new_plan_type IS NULL THEN
        RAISE EXCEPTION 'Invalid new saving plan id: %', p_new_saving_plan_id;
    END IF;

    IF v_old_plan_type = 'Joint' OR v_new_plan_type = 'Joint' THEN
        RAISE EXCEPTION 'Plan changes to/from Joint are not allowed';
    END IF;

    IF v_old_plan_id = p_new_saving_plan_id THEN
        RAISE EXCEPTION 'Account is already on the requested plan';
    END IF;

    -- Assumes a single owner (first Takes row)
    SELECT t.customer_id INTO v_customer_id FROM takes t WHERE t.account_id = p_account_id LIMIT 1;
    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Account has no owner linked';
    END IF;

    SELECT c.date_of_birth INTO v_dob FROM customer c WHERE c.customer_id = v_customer_id;
    IF v_dob IS NULL THEN
        RAISE EXCEPTION 'Owner date of birth missing';
    END IF;

    v_age_years := DATE_PART('year', age(CURRENT_DATE, v_dob))::INTEGER;

    IF p_new_nic IS NOT NULL AND btrim(p_new_nic) <> '' THEN
        IF length(p_new_nic) > 30 THEN
            RAISE EXCEPTION 'NIC length must be 30 characters or fewer';
        END IF;
        IF NOT (p_new_nic ~ '^[0-9]{12}$' OR p_new_nic ~ '^[0-9]{9}V$') THEN
            RAISE EXCEPTION 'Invalid NIC format. Must be 12 digits or 9 digits followed by V';
        END IF;
        UPDATE customer SET nic = btrim(p_new_nic) WHERE customer_id = v_customer_id;
    END IF;

    -- Allowed: Children -> Teen (>=12), Teen -> Adult (>=18), Adult -> Senior (>=60)
    IF v_new_plan_type = 'Children' THEN
        RAISE EXCEPTION 'Downgrades are not allowed';
    ELSIF v_new_plan_type = 'Teen' THEN
        IF v_old_plan_type <> 'Children' OR v_age_years < 12 THEN
            RAISE EXCEPTION 'Teen plan change requires current plan Children and age >= 12';
        END IF;
    ELSIF v_new_plan_type = 'Adult' THEN
        IF v_age_years < 18 THEN
            RAISE EXCEPTION 'Adult plan requires age >= 18';
        END IF;
        IF v_old_plan_type = 'Senior' THEN
            RAISE EXCEPTION 'Downgrades are not allowed';
        END IF;
        IF v_old_plan_type = 'Teen' THEN
            IF p_new_nic IS NULL OR btrim(p_new_nic) = '' THEN
                RAISE EXCEPTION 'NIC is required when upgrading Teen plan to Adult';
            END IF;
            IF NOT (p_new_nic ~ '^[0-9]{12}$' OR p_new_nic ~ '^[0-9]{9}V$') THEN
                RAISE EXCEPTION 'Invalid NIC format for Adult upgrade. Must be 12 digits or 9 digits followed by V';
            END IF;
        END IF;
    ELSIF v_new_plan_type = 'Senior' THEN
        IF v_age_years < 60 THEN
            RAISE EXCEPTION 'Senior plan requires age >= 60';
        END IF;
    END IF;

    IF v_balance < v_min_balance_new THEN
        RAISE EXCEPTION 'Current balance % is below the new plan''s minimum balance %', v_balance, v_min_balance_new;
    END IF;

    PERFORM set_config('app.plan_change_allowed', 'true', true);
    PERFORM set_config('app.plan_change_account_id', p_account_id::text, true);

    UPDATE account SET saving_plan_id = p_new_saving_plan_id WHERE account_id = p_account_id;

    INSERT INTO account_plan_change_audit(
        account_id, old_saving_plan_id, new_saving_plan_id, reason, changed_by_employee_id
    ) VALUES (
        p_account_id, v_old_plan_id, p_new_saving_plan_id, p_reason, p_actor_employee_id
    );

    PERFORM set_config('app.plan_change_allowed', 'false', true);
    PERFORM set_config('app.plan_change_account_id', '', true);

END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fd_autocalc_maturity_date() RETURNS TRIGGER AS $$
DECLARE
    v_option fd_options_type;
BEGIN
    IF NEW.fd_status = 'Active' THEN
        SELECT fp.fd_options INTO v_option FROM fdplan fp WHERE fp.fd_plan_id = NEW.fd_plan_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid FD plan id: %', NEW.fd_plan_id;
        END IF;
        NEW.maturity_date := NEW.open_date +
            CASE v_option
                WHEN '6 months' THEN INTERVAL '6 months'
                WHEN '1 year' THEN INTERVAL '1 year'
                WHEN '3 years' THEN INTERVAL '3 years'
            END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fd_autocalc_maturity ON fixeddeposit;
CREATE TRIGGER trigger_fd_autocalc_maturity
    BEFORE INSERT OR UPDATE OF open_date, fd_plan_id, fd_status ON fixeddeposit
    FOR EACH ROW
    EXECUTE FUNCTION fd_autocalc_maturity_date();

DROP TRIGGER IF EXISTS trigger_audit_transaction ON transaction;
DROP TRIGGER IF EXISTS trigger_before_transaction_validate_apply ON transaction;
DROP TRIGGER IF EXISTS trigger_after_transaction_audit ON transaction;

CREATE OR REPLACE FUNCTION transaction_validate_and_apply() RETURNS TRIGGER AS $$
DECLARE
    v_allowed BOOLEAN := FALSE;
    v_current_balance DECIMAL(15,2);
    v_account_status account_status_type;
BEGIN
    IF NEW.time IS NULL THEN
        NEW.time := CURRENT_TIMESTAMP;
    END IF;

    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Transaction amount must be positive';
    END IF;

    IF NEW.time > (CURRENT_TIMESTAMP + INTERVAL '5 minutes') THEN
        RAISE EXCEPTION 'Transaction time cannot be more than 5 minutes in the future';
    END IF;
    IF NEW.time < (CURRENT_TIMESTAMP - INTERVAL '1 day') THEN
        RAISE EXCEPTION 'Transaction time cannot be more than 1 day in the past';
    END IF;

    IF NEW.transaction_type IN ('Deposit', 'Withdrawal', 'Interest') THEN
        v_allowed := TRUE;
    END IF;
    IF NOT v_allowed THEN
        RAISE EXCEPTION 'Unsupported transaction type for single-account entry: %', NEW.transaction_type;
    END IF;

    SELECT balance, account_status INTO v_current_balance, v_account_status
    FROM account WHERE account_id = NEW.account_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found: %', NEW.account_id;
    END IF;

    IF v_account_status::text = 'Closed' THEN
        RAISE EXCEPTION 'Account is closed';
    END IF;

    -- Account closure zeroes the balance first, then inserts this withdrawal for audit only
    IF NEW.transaction_type = 'Withdrawal' AND (
        NEW.description ILIKE 'Account Closure%' OR NEW.description ILIKE '%Account Closure%'
    ) THEN
        RETURN NEW;
    END IF;

    PERFORM update_account_balance(NEW.account_id, NEW.amount, NEW.transaction_type);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_before_transaction_validate_apply
    BEFORE INSERT ON transaction
    FOR EACH ROW
    EXECUTE FUNCTION transaction_validate_and_apply();

CREATE OR REPLACE FUNCTION audit_transaction_success() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO transaction_audit_log (
        transaction_type, amount, attempted_time, description, 
        account_id, employee_id, status
    ) VALUES (
        NEW.transaction_type, NEW.amount, NEW.time, NEW.description,
        NEW.account_id, NEW.employee_id, 'success'
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_transaction_audit
    AFTER INSERT ON transaction
    FOR EACH ROW
    EXECUTE FUNCTION audit_transaction_success();

CREATE TABLE IF NOT EXISTS customer_audit_log (
    audit_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    changed_by_employee_id INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_fields TEXT[],
    old_data JSONB,
    new_data JSONB
);

CREATE OR REPLACE FUNCTION audit_customer_changes() RETURNS TRIGGER AS $$
DECLARE
    v_changed TEXT[] := ARRAY[]::TEXT[];
    v_actor TEXT;
    v_actor_id INTEGER;
BEGIN
    IF NEW.first_name IS DISTINCT FROM OLD.first_name THEN v_changed := array_append(v_changed, 'first_name'); END IF;
    IF NEW.last_name  IS DISTINCT FROM OLD.last_name  THEN v_changed := array_append(v_changed, 'last_name');  END IF;
    IF NEW.gender     IS DISTINCT FROM OLD.gender     THEN v_changed := array_append(v_changed, 'gender');     END IF;
    IF NEW.nic        IS DISTINCT FROM OLD.nic        THEN v_changed := array_append(v_changed, 'nic');        END IF;
    IF NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN v_changed := array_append(v_changed, 'date_of_birth'); END IF;
    IF NEW.contact_id IS DISTINCT FROM OLD.contact_id THEN v_changed := array_append(v_changed, 'contact_id'); END IF;

    IF array_length(v_changed, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    v_actor := current_setting('app.actor_employee_id', true);
    IF v_actor IS NOT NULL THEN v_actor_id := v_actor::INTEGER; END IF;

    INSERT INTO customer_audit_log (customer_id, changed_by_employee_id, changed_fields, old_data, new_data)
    VALUES (NEW.customer_id, v_actor_id, v_changed, to_jsonb(OLD), to_jsonb(NEW));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customer_audit ON customer;
CREATE TRIGGER trigger_customer_audit
    AFTER UPDATE ON customer
    FOR EACH ROW
    EXECUTE FUNCTION audit_customer_changes();

CREATE OR REPLACE FUNCTION audit_customer_contact_changes() RETURNS TRIGGER AS $$
DECLARE
    v_changed TEXT[] := ARRAY[]::TEXT[];
    v_actor TEXT;
    v_actor_id INTEGER;
    rec RECORD;
BEGIN
    IF NEW.type <> 'customer' THEN
        RETURN NEW;
    END IF;

    IF NEW.contact_no_1 IS DISTINCT FROM OLD.contact_no_1 THEN v_changed := array_append(v_changed, 'contact_no_1'); END IF;
    IF NEW.contact_no_2 IS DISTINCT FROM OLD.contact_no_2 THEN v_changed := array_append(v_changed, 'contact_no_2'); END IF;
    IF NEW.address      IS DISTINCT FROM OLD.address      THEN v_changed := array_append(v_changed, 'address');      END IF;
    IF NEW.email        IS DISTINCT FROM OLD.email        THEN v_changed := array_append(v_changed, 'email');        END IF;

    IF array_length(v_changed, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    v_actor := current_setting('app.actor_employee_id', true);
    IF v_actor IS NOT NULL THEN v_actor_id := v_actor::INTEGER; END IF;

    FOR rec IN SELECT customer_id FROM customer WHERE contact_id = NEW.contact_id LOOP
        INSERT INTO customer_audit_log (
            customer_id, changed_by_employee_id, changed_fields, old_data, new_data
        ) VALUES (
            rec.customer_id,
            v_actor_id,
            v_changed,
            jsonb_build_object('contact', to_jsonb(OLD)),
            jsonb_build_object('contact', to_jsonb(NEW))
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customer_contact_audit ON contact;
CREATE TRIGGER trigger_customer_contact_audit
    AFTER UPDATE OF contact_no_1, contact_no_2, address, email ON contact
    FOR EACH ROW
    EXECUTE FUNCTION audit_customer_contact_changes();

DROP MATERIALIZED VIEW IF EXISTS mv_daily_account_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_fd_performance CASCADE;
DROP FUNCTION IF EXISTS refresh_materialized_views();

CREATE OR REPLACE VIEW v_transaction_enriched AS
SELECT
    t.transaction_id,
    t.transaction_type,
    t.amount,
    t.time,
    t.account_id,
    t.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    a.branch_id,
    CASE WHEN t.transaction_type = 'Deposit' THEN t.amount ELSE 0 END AS deposit_amount,
    CASE WHEN t.transaction_type = 'Withdrawal' THEN t.amount ELSE 0 END AS withdrawal_amount,
        CASE 
            WHEN t.transaction_type IN ('Deposit', 'Interest') THEN t.amount 
            WHEN t.transaction_type = 'Withdrawal' THEN -t.amount 
            ELSE 0 
        END AS net_value
FROM transaction t
LEFT JOIN employee e ON e.employee_id = t.employee_id
LEFT JOIN account a ON a.account_id = t.account_id;

CREATE OR REPLACE VIEW v_account_customers AS
SELECT
    a.account_id,
    STRING_AGG(DISTINCT c.first_name || ' ' || c.last_name, ', ') AS customer_names
FROM account a
JOIN takes tk ON tk.account_id = a.account_id
JOIN customer c ON c.customer_id = tk.customer_id
GROUP BY a.account_id;

CREATE OR REPLACE VIEW v_active_fd_overview AS
WITH last_credited AS (
    SELECT fd_id, MAX(calculation_date) AS last_date
    FROM fd_interest_calculations
    WHERE status = 'credited'
    GROUP BY fd_id
)
SELECT 
    fd.fd_id,
    a.account_id,
    (
      SELECT STRING_AGG(DISTINCT c.first_name || ' ' || c.last_name, ', ')
      FROM takes t2
      JOIN customer c ON c.customer_id = t2.customer_id
      WHERE t2.account_id = a.account_id
    ) AS customer_names,
    fd.fd_balance,
    fp.interest AS interest_rate,
    fd.open_date,
    fd.maturity_date,
    fd.auto_renewal_status,
    (COALESCE(l.last_date, fd.open_date) + INTERVAL '30 days')::date AS next_interest_date
FROM fixeddeposit fd
JOIN fdplan fp ON fd.fd_plan_id = fp.fd_plan_id
JOIN account a ON fd.fd_id = a.fd_id
LEFT JOIN last_credited l ON l.fd_id = fd.fd_id
WHERE fd.fd_status = 'Active'
GROUP BY fd.fd_id, a.account_id, fd.fd_balance, fp.interest, fd.open_date, fd.maturity_date, fd.auto_renewal_status, l.last_date;

CREATE OR REPLACE VIEW v_monthly_interest_summary AS
SELECT 
    'Fixed Deposit'::text AS plan_type,
    fp.fd_options::text AS account_type,
    EXTRACT(MONTH FROM fic.credited_at)::int AS month,
    EXTRACT(YEAR FROM fic.credited_at)::int AS year,
    COALESCE(SUM(fic.interest_amount), 0)::numeric AS total_interest,
    COUNT(DISTINCT fic.fd_id)::int AS account_count,
    COALESCE(ROUND(AVG(fic.interest_amount), 2), 0)::numeric AS average_interest
FROM fd_interest_calculations fic
JOIN fixeddeposit fd ON fic.fd_id = fd.fd_id
JOIN fdplan fp ON fd.fd_plan_id = fp.fd_plan_id
WHERE fic.status = 'credited'
GROUP BY fp.fd_options, EXTRACT(MONTH FROM fic.credited_at), EXTRACT(YEAR FROM fic.credited_at)

UNION ALL

SELECT 
    'Savings'::text AS plan_type,
    sic.plan_type::text AS account_type,
    EXTRACT(MONTH FROM sic.credited_at)::int AS month,
    EXTRACT(YEAR FROM sic.credited_at)::int AS year,
    COALESCE(SUM(sic.interest_amount), 0)::numeric AS total_interest,
    COUNT(DISTINCT sic.account_id)::int AS account_count,
    COALESCE(ROUND(AVG(sic.interest_amount), 2), 0)::numeric AS average_interest
FROM savings_interest_calculations sic
WHERE sic.status = 'credited'
GROUP BY sic.plan_type, EXTRACT(MONTH FROM sic.credited_at), EXTRACT(YEAR FROM sic.credited_at);

CREATE OR REPLACE VIEW v_customer_transaction_enriched AS
SELECT 
    c.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    a.account_id,
    t.transaction_id,
    t.time::date AS transaction_date,
    CASE WHEN t.transaction_type = 'Deposit' THEN t.amount ELSE 0 END AS deposit_amount,
    CASE WHEN t.transaction_type = 'Withdrawal' THEN t.amount ELSE 0 END AS withdrawal_amount,
        CASE 
            WHEN t.transaction_type IN ('Deposit', 'Interest') THEN t.amount 
            WHEN t.transaction_type = 'Withdrawal' THEN -t.amount 
            ELSE 0 
        END AS net_value
FROM customer c
LEFT JOIN takes tk ON c.customer_id = tk.customer_id
LEFT JOIN account a ON tk.account_id = a.account_id
LEFT JOIN transaction t ON a.account_id = t.account_id;

CREATE INDEX IF NOT EXISTS idx_employee_username ON Employee(username);
CREATE INDEX IF NOT EXISTS idx_employee_role ON Employee(role);
CREATE INDEX IF NOT EXISTS idx_customer_nic ON Customer(nic);
CREATE INDEX IF NOT EXISTS idx_account_status ON Account(account_status);
CREATE INDEX IF NOT EXISTS idx_account_branch ON Account(branch_id);
CREATE INDEX IF NOT EXISTS idx_transaction_account ON Transaction(account_id);
CREATE INDEX IF NOT EXISTS idx_transaction_time ON Transaction(time);
CREATE INDEX IF NOT EXISTS idx_transaction_employee ON Transaction(employee_id);
CREATE INDEX IF NOT EXISTS idx_takes_customer ON Takes(customer_id);
CREATE INDEX IF NOT EXISTS idx_takes_account ON Takes(account_id);
CREATE INDEX IF NOT EXISTS idx_fixed_deposit_status ON FixedDeposit(fd_status);
CREATE INDEX IF NOT EXISTS idx_contact_type ON Contact(type);
CREATE INDEX IF NOT EXISTS idx_savings_interest_account_id ON savings_interest_calculations(account_id);
CREATE INDEX IF NOT EXISTS idx_savings_interest_status ON savings_interest_calculations(status);
CREATE INDEX IF NOT EXISTS idx_savings_interest_calculation_date ON savings_interest_calculations(calculation_date);
CREATE INDEX IF NOT EXISTS idx_fd_interest_fd_id ON fd_interest_calculations(fd_id);
CREATE INDEX IF NOT EXISTS idx_fd_interest_status ON fd_interest_calculations(status);
CREATE INDEX IF NOT EXISTS idx_fd_interest_calculation_date ON fd_interest_calculations(calculation_date);

CREATE INDEX IF NOT EXISTS idx_transaction_account_time 
ON transaction(account_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_account_branch_status 
ON account(branch_id, account_status);

CREATE INDEX IF NOT EXISTS idx_fixed_deposit_status_maturity 
ON fixeddeposit(fd_status, maturity_date) 
WHERE fd_status = 'Active';

CREATE INDEX IF NOT EXISTS idx_customer_account_relationship 
ON takes(customer_id, account_id);

CREATE INDEX IF NOT EXISTS idx_employee_branch_role 
ON employee(branch_id, role);

CREATE INDEX IF NOT EXISTS idx_active_accounts 
ON account(account_id) 
WHERE account_status = 'Active';

CREATE INDEX IF NOT EXISTS idx_interest_calculations_date 
ON fd_interest_calculations(calculation_date, status);

CREATE INDEX IF NOT EXISTS idx_savings_interest_account_date 
ON savings_interest_calculations(account_id, calculation_date, status);

ALTER TABLE account ADD CONSTRAINT unique_fd_per_account UNIQUE (fd_id);
CREATE INDEX IF NOT EXISTS idx_account_fd_id ON Account(fd_id);

