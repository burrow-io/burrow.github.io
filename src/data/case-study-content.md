# Overview

Burrow is a self-hosted data ingestion pipeline and retrieval API that streamlines and accelerates the development of RAG applications. RAG (Retrieval Augmented Generation) has become a widely adopted technique to augment modern AI applications with proprietary and domain-specific knowledge. Processing knowledge bases into usable data for RAG, however, is a complex undertaking that requires time and expertise.

Many organizations have sizable knowledge bases with diverse, unstructured data, such as PDFs, wiki pages, meeting transcripts, and scanned documents. These inputs require new data processing workflows to enable RAG. They take unstructured data as input and perform the necessary steps of parsing, chunking, and embedding to prepare data for retrieval.

Production data pipelines for these steps can be complicated to build and difficult to manage over time. They often require setting up one or more open-source frameworks, understanding evolving best practices for document processing and retrieval, and addressing scalability issues as applications grow.

Burrow is designed to simplify this process for developers while also providing advanced functionality that aligns with current research on improving document parsing and retrieval quality. Its serverless, event-driven architecture can be deployed onto users' AWS infrastructure, creating a scalable, automated data ingestion solution that preserves data privacy. Burrow also includes production-ready APIs for easy integration, so users can focus on building and refining their AI applications.

# Background

## The Importance of Retrieval Augmented Generation

Innovation in hardware, transformer architecture, and machine learning over the last decade has produced a new class of powerful artificial intelligence: large language models (LLMs). By training on text from billions of books, documents, and articles, these models develop broad predictive capabilities that transfer across many domains. LLMs are now being deployed for knowledge-intensive tasks like scientific research, customer support, and document analysis across a wide range of industries.

The extensive training process for LLMs, however, also leads to a fundamental shortcoming: they can generate responses to user prompts based only on their training data, and so their ability to reference facts, statistics, and events is frozen in time. Worse, in the absence of concrete information to ground responses, LLMs will nonetheless confidently issue incorrect answers. This unwelcome phenomenon is known as "hallucination".

LLM hallucinations can be a source of amusement in day-to-day usage, but they might just as easily lead to catastrophic consequences in settings like law or healthcare, where accuracy is critical. The risk of hallucinations is why RAG has emerged alongside LLMs as a fundamental technique for building modern AI applications. RAG provides LLMs with up-to-date, proprietary, or domain-specific knowledge they did not encounter during training, enabling them to generate responses grounded in sources of truth.

## Vector Search

RAG most commonly uses an information retrieval technique called vector search to compare a user prompt with candidate document fragments, otherwise known as chunks. The prompt and document chunks are transformed into mathematical representations called vector embeddings that algorithms can then use to calculate similarity.

Vector search has existed for decades, but the same innovations that enabled breakthroughs in LLMs have also led to dramatic improvements in embedding models. Modern models produce embeddings that are far more accurate and can effectively capture semantic relationships between words.

Using a simplified 3-dimensional example, an embedding model trained on text will arrange words with similar meanings so that their vectors are close to each other. "Squirrel" and "Chipmunk" are positioned close to each other in the embedding space while "Piano" is further away.

In addition to single words, modern embedding models also excel at creating accurate embeddings for larger chunks of text, such as sentences and paragraphs, enabling reliable comparisons across documents. This has laid the foundation for significant advances in the field of information retrieval: systems can now find relevant data and documents for a query with a nuanced understanding of meaning and context compared to simpler lexical approaches. In combination with LLMs, this capability has established the RAG pattern for building AI applications.

In a RAG system, the generative LLM does not respond immediately to a user query. It waits for an algorithm that queries a vector database to find relevant chunks based on vector similarity. These chunks are bundled together with the query and passed along with a system prompt that tells the LLM how to use the chunks in its response. The final response is returned to the user, and can now be said to have been grounded in additional context or sources of truth.

Before retrieval can happen, however, unstructured data must go through several processing stages. The RAG data processing pipeline has emerged as a standard process to address the unique challenges of preparing this data for modern vector-based retrieval.

## The RAG Data Processing Pipeline

For many organizations, proprietary or domain-specific knowledge exists as unstructured data in knowledge bases. In contrast to traditional ETL (Extract-Transform-Load) pipelines that tend to extract data from structured sources with clear schema and relationships, unstructured data requires a different set of processes before it is available for retrieval in the form of vector embeddings.

- **Parsing**: Raw files must be processed into a usable text-based format like JSON or Markdown using methods such as Optical Character Recognition (OCR) and document layout analysis
- **Chunking**: These text representations of documents must be split into chunks small enough to incorporate into an LLM's context window–the most information the model can process at once.
- **Embedding**: Specialized models embed document text chunks into multidimensional vectors that represent the meaning of data and allow for semantic comparison
- **Storage and Indexing**: Vectors are persisted in a central datastore and organized with data structures optimized for similarity search algorithms

At retrieval time, a user query is vectorized with the same model used at the Embedding stage so that it exists in the same vector space as document chunks. Mathematical algorithms like approximate-nearest-neighbor (ANN) perform calculations to efficiently identify the chunks closest to the query, resulting in a final list of the most semantically similar chunks.

The document processing sequence described above has by now become the standard process for RAG data ingestion.

Basic implementations of ingestion for RAG, however, face some significant limitations. They may be adequate for prototypes or small knowledge bases with cleanly formatted text documents, but production environments introduce greater uncertainty. Real-world documents have tables, diagrams, and columns; retrieval based solely on vector similarity performs poorly for more complex or nuanced queries; and pipelines break when document ingestion and retrieval volumes scale.

While researching and building Burrow, two areas emerged as particularly high-leverage opportunities for enhancing the standard RAG pipeline: document parsing and retrieval quality.

# The Current RAG Landscape

## Document Parsing Challenges

A common approach to DIY RAG pipelines is to address pipeline stages in isolation. We found this especially true for chunking, where a common assumption in research and discussions seems to be that the input is clean markdown with clear headings and structured sections. In practice, however, most organizational knowledge lives in PDFs, spreadsheets or presentations, and comes formatted in a variety of complex layouts with tables, columns, and footnotes.

This complexity is why focusing on chunking as a process independent of the parsing step can lead to disappointing results. No chunking strategy can address columns that have been spliced or tables that have been compressed into meaningless streams of text.

Traditional document parsers are often to blame for these parsing mishaps. They treat files such as PDFs as containers of text to be extracted into a uniform stream of characters. The result is a loss of the information defined implicitly by document structure and hierarchies. Multi-column layouts are read straight across from left to right, header hierarchies are flattened into plain text, and tables lose their row and column relationships.

Emerging solutions address these problems with computer vision models trained specifically to understand document layouts. They detect structural elements such as headers, columns, and tables and determine the correct reading order. This sophisticated layout analysis is more computationally intensive than traditional document parsers, but the trade-off can be justified by the cascading quality improvements throughout the rest of the pipeline.

## Retrieval Quality Challenges

After documents are properly parsed, chunked, and stored as embeddings, the next challenge is retrieval quality. Vector search is a powerful foundation for semantic retrieval, but it has some fundamental limitations:

- **No keyword or exact match capability**: Vector search can overlook documents containing specific keywords or terms that appear in the query
- **Retrieval noise**: The chunks most similar to a query may not necessarily be the chunks that are most relevant for answering that question
- **Lack of filtering**: Large numbers of embeddings are often stored in a single search space, but users may need to scope retrieval to specific document types, date ranges, or other metadata.

Three techniques have been shown to be particularly effective in addressing these issues.

### 1. Hybrid Search

Vector search is excellent for semantic comparison: finding sentences with similar meaning even if they have no common words or contain typos. It can fall short, however, in cases that demand precision. A query like "error code 0x80070005" might return chunks for semantically related error discussions, but overlook results mentioning that exact code.

An example of vector search finding a similar but irrelevant result

Keyword search has the opposite problem: it's precise but literal. "Burrow pipeline install" might surface an article titled "Newly installed water pipeline disrupts underground burrows, enraging local squirrel population" instead of the quick start guide to your favorite RAG ETL tool.

Hybrid search is a technique that performs vector and keyword search separately, then uses a fusion algorithm to merge the results. The algorithm rewards chunks that rank highly in both lists. This approach leverages each technique's strengths while minimizing its weaknesses.

### 2. Reranking

Vector retrieval looks for chunks based on topical similarity, but similar chunks may not be the most relevant for answering a query. A question such as "What was the average quarterly revenue in 2025?" might retrieve ten chunks discussing quarterly revenue, with only one providing a direct answer.

Reranking is a technique that addresses this gap. It starts by retrieving a larger set of chunks than usual for initial retrieval. A specialized reranking model trained to detect relevance is used to jointly encode these candidate chunks and the query. The output of the model is a relevance score, which is used to rerank the candidates and return the top results.

Reranking increases retrieval latency due to the additional model calls, but this tradeoff can be justified if accuracy is critical and relevant chunks are being lost in noisy retrieval results.

### 3. Metadata Filtering

There are often situations where a user might want to limit retrieval to certain chunks based on specific business logic that embeddings can't capture. A consulting firm might want to summarize data from specific industries. A legal team might want to search documents from a particular date range.

Adding filterable metadata to document chunks is a simple but effective way to enforce these constraints. Narrowing the search space before retrieval using metadata filters can improve relevance and performance.

Research shows these techniques outperform basic vector search across a wide range of retrieval benchmarks. Moreover, these techniques can be combined for even greater retrieval performance.

## Existing Solutions and Tradeoffs

Developers building RAG apps that integrate advanced document parsing and production-grade retrieval usually face two choices: build custom pipelines or use managed services.

### DIY Ingestion Pipelines

Custom-built ingestion pipelines offer flexibility, especially with popular orchestration frameworks like Langchain and LlamaIndex that can be used for much more than data processing. But they come with significant challenges:

- **Scalability**: Document ingestion is often bursty. Running pipelines on your own servers means paying for capacity that is idle most of the time.
- **Maintenance**: As AI systems grow, each addition–new models, chunking strategies, evaluation tools–adds complexity to the web of dependencies that must be managed.
- **Orchestration and Integration**: Automating data flow across ingestion components and plugging pipelines into production environments is hard to do reliably for DIY solutions.
- **Expertise**: Staying current with RAG research is a job in itself. Implementing production features such as hybrid search requires a deep understanding of retrieval techniques and tooling.

DIY pipelines are great for getting started and customization, but they demand significant ongoing investment.

### Managed Solutions

Managed solutions address these pain points. Products like Ragie and Vectorize represent a new category sometimes called "RAG as a Service". They offer:

- Proprietary vision models for layout-aware parsing and chunking
- Built-in hybrid search, reranking, and metadata filtering
- Managed cloud infrastructure that can scale
- Range of source and destination connectors
- Web-based GUIs for uploading documents and monitoring ingestion statuses
- APIs for integrating vector stores into RAG applications.

However, they come with their own tradeoffs:

- **Data control**: Documents must be uploaded to a third-party environment. Using vendor data stores places data in a black box only accessible via API.
- **Vendor lock-in**: Application architecture becomes dependent on proprietary platforms and models.
- **Cost at scale**: Per-document and per-query pricing can grow quickly as usage increases.

Given the limitations of DIY and managed services, there exists a gap in the market for open-source solutions that offer the convenience and scalability of managed services.

# Introducing Burrow

## What Makes Burrow Unique?

Burrow fills this gap between managed services and DIY approaches. It's not as feature-rich as Ragie or Vectorize, nor as customizable as a DIY pipeline, but by focusing on key areas, it delivers value for developers who want cost-effective, production-grade RAG in a scalable open-source solution.

In the landscape of RAG ETL pipelines, Burrow is built on a few core value propositions:

1. **Automation and integration**: Burrow's pipeline automates the transformations that turn documents into a database of ready-to-query vectors and provides a web GUI and REST API so teams can unify scattered knowledge with minimal engineering effort.
2. **State-of-the-art document processing**: Layout-aware parsing along with intelligent chunking that preserves document structure using the Docling library.
3. **Production-grade retrieval**: A RAG API with toggleable parameters for hybrid search, reranking, and metadata filtering.
4. **Self-hosted serverless architecture**: Automated deployment to your AWS environment. Performance and cost scale based on usage patterns.

## Example Use Cases

### Diverse Training Materials

Hotel groups maintain diverse training materials: onboarding handbooks with multi-column layouts, sales manuals with pricing tables, and brand guidelines with annotated images. Burrow's advanced document parsing handles complex layouts out of the box. Tables preserve their row and column relationships. Multi-column pages are read in the correct order. Training staff can search these materials and obtain coherent answers even when the source documents mix text, tables, and visual elements.

### Secure Onboarding Experiences

New hires often struggle to find information scattered across wikis, PDFs, and internal documents. Most companies face an awkward choice: entrust sensitive information to third-party tools, or spend months building their own search solution. Burrow lets teams deploy a searchable knowledge base in their own AWS environment with a single command. New hires can ask "How do we handle customer data in Europe?" and get relevant answers without knowing the exact keywords to search for. Because everything runs on the company's AWS environment, internal policies and roadmaps stay secure. Teams can focus on creating better onboarding content instead of managing infrastructure.

### Consulting and Professional Services

Consulting firms experience dramatic spikes in document activity. At the start of client engagements, hundreds of documents are uploaded in days, followed by intense research as teams ramp up. Traditional infrastructure means either paying for peak capacity year-round or scrambling to scale resources when a big project lands. Burrow's event-driven architecture automatically manages capacity. Ingestion tasks spin up to process new documents in parallel, then scale to zero between projects. Query traffic follows the same pattern: resources scale automatically with demand during active research phases. Firms pay for what they use rather than maintain excess infrastructure rated for their busiest weeks.

# Walkthrough and Design

## Pipeline Management

Burrow provides users with flexible options for ingesting files and managing the pipeline.

The Burrow pipeline dashboard is a convenient interface for uploading files, managing documents, and monitoring ingestion statuses. Hosted via CloudFront, it supports multiple users so teams can securely share pipeline access and connect scattered knowledge bases.

The dashboard's functionality is also available to users as a REST API, which enables users to write scripts and automate workflows as their knowledge bases scale. OpenAPI-based documentation is easily accessible in the management UI.

Together, the web UI and Pipeline API allow users to build RAG applications quickly and automate them as they scale.

What happens when a file is uploaded? Behind the scenes, Burrow first streams the file to an S3 bucket. This event triggers the rest of the ingestion workflow, spinning up the resources needed to transform documents into ready-to-query vectors in a database. Burrow tracks each document as it moves through these stages and displays status updates on the dashboard.

## Ingestion Engine

The ingestion engine is a self-contained, transient task that scales horizontally per upload. It orchestrates the transformations of parsing, chunking, embedding, and also persists vectors to a centralized database.

### Why Docling

For our parsing engine, we landed on Docling as the strongest open-source option for advanced document processing. In one benchmark study using complex PDF sustainability reports, it outperformed Unstructured and LlamaParse, two widely used document processing platforms for enterprise RAG. Its approach to chunking leverages the information preserved by its layout-aware parsing process.

### How Docling Parses Documents

Docling was released by IBM in 2024 to meet growing demand for better document parsing in LLM pipelines. In addition to a state-of-the-art Optical Character Recognition (OCR) model, Docling comes with two advanced vision models.

- A layout vision model creates a map of document elements (text blocks, headers, tables). This map is then interpreted by an algorithm that determines the correct reading order and decides how to further parse each element.
- A table structure model interprets any tables found in the previous step and converts them into markdown format.

Once all text has been extracted from all elements using format-specific parsers, Docling assembles it in the correct order. Structured JSON is used to preserve key information about the document's hierarchical structure, such as filename, page numbers, and element types, as metadata.

### HybridChunker

Docling also includes a built-in chunker that uses this metadata to split content into chunks while respecting the boundaries of document elements. It takes a token limit parameter to determine chunk size. We used 4096 tokens as a default to balance context size and embedding precision.

If a document section is larger than this chunk size, Docling uses a semantic splitting strategy that relies on natural separators like newlines or tabs, sentence terminators (. ? ! and \*), and other meaningful characters to avoid splitting text mid-sentence.

Chunks do not cross section boundaries. By default, small adjacent sections are combined into larger chunks until they reach the maximum chunk size.

This approach addresses the problem we discussed earlier: no chunking strategy can make up for destructive parsing. Chunking should actually benefit from parsing, not try to fix it. By integrating with Docling's layout analysis, HybridChunker ensures chunks preserve a document's structural context.

### Embedding

Finalized chunks are embedded with Titan Text Embeddings V2, an AWS embedding model optimized for RAG use cases. Because it is available on Amazon Bedrock, data does not have to leave users' AWS environment.

## Vector Storage

The finalized chunks are then embedded and stored in a PostgreSQL database, along with the Docling metadata.

The database has been configured with an index for the metadata column as well as additional indexes for keyword and vector search, enabling the different retrieval options available in the RAG API.

At this stage, documents have completed their journey through the pipeline, and Burrow can deprovision ingestion resources to minimize cost.

## Production-Ready RAG API

Now that document chunks are centralized and indexed as vectors, they are ready for retrieval. We implemented the enhanced retrieval techniques described earlier:

- Hybrid search
- Reranking
- Metadata filtering

and exposed them as API parameters. This provides developers with flexible, production-ready retrieval options without having to build those components themselves.

Developers who build a RAG pipeline from scratch must configure database indices, integrate reranking models, and implement the logic for these techniques themselves. Burrow abstracts this complexity behind two endpoints:

- **/retrieve**: Retrieve raw text chunks similar to the query
- **/query**: Synthesizes query and text chunks, prompts an LLM, and returns its generated answer

Users can configure retrieval behavior with optional parameters to enable enhanced retrieval features:

These simple routes and flexible parameters support a range of use cases.

- Developers can start off with /query for quick integration or prototyping.
- They can switch to /retrieve when they want more control over retrieval results, such as adding their own system prompts, implementing custom weights for hybrid search, or experimenting with new retrieval strategies.
- They can enable reranking for queries that demand high accuracy and revert to basic vector search when response speed is more important.

OpenAPI-based documentation for the RAG API is available in the web UI along with tools for testing different retrieval and query requests.

Burrow's ingestion pipeline and API create a simple and predictable user experience. Documents are uploaded and can be monitored through the dashboard. Meanwhile, Burrow ingests, parses, chunks, embeds, and indexes them so that they are immediately queryable via API routes. This approach enables fast, reliable knowledge updates that plug directly into production RAG workflows.

## Command Line Interface

A simple command-line interface allows users to easily deploy Burrow to their AWS infrastructure and get started with their pipeline.

For a full step-by-step guide to the CLI and installation, check out our [Quick Start Guide](/docs#quick-start).

# Building Burrow

## High-Level Architecture

Serverless architecture aligns naturally with Burrow's goals. There's no infrastructure for users to provision or maintain. Resources scale up to handle load spikes and down to optimize cost. These characteristics perfectly suit the sporadic nature of document ingestion workflows.

Event-driven architecture is a pattern that complements serverless compute by decoupling system components while still allowing them to work together by emitting and responding to events. File uploads trigger ingestion tasks without tight coordination and complex dependencies. Changes to a single component do not propagate throughout the system. The result is a more resilient system that is easier to update and debug.

AWS is a natural fit for Burrow given its breadth of serverless offerings and event-driven capabilities. We built Burrow's core components as containers running on AWS Fargate, which automatically manages the complexity of provisioning and scaling. We also use other serverless components, such as S3, EventBridge, DynamoDB, Aurora Serverless, and Bedrock.

These components fall into the five distinct subsystems that make up Burrow:

1. Pipeline Managment
2. Event-driven Triggers
3. Ingestion Task
4. Vector Store
5. RAG API

## Pipeline Management

CloudFront functions as a secure entry point to Burrow's pipeline: it routes API traffic to the Application Load Balancer while serving the web UI as a single-page application. When a user uploads a file, the request is forwarded to the ALB, which then routes it to a healthy container in the Pipeline API's ECS service.

Clients authenticate via JSON Web Tokens (JWT) - a stateless approach that works for both browser users and automated scripts. This flexibility enables an API-first development approach that scales to support different client types–in Burrow's case, these were the management dashboard and pipeline API.

If the client is authenticated, the file is uploaded to S3 using the multer-s3 middleware for direct streaming, avoiding the overhead of buffering files in RAM or writing them to disk. Once the file is uploaded, the pipeline API creates a record of the document in DynamoDB with a status set to pending. This record and status are also sent back to the client. Subsequent status updates as documents advance through the pipeline trigger Server Sent Events (SSE) to notify clients of ingestion progress.

At this point, the file is in S3, and the client has been updated. What happens next is driven by events.

## Event-Driven Triggers

Using S3 for file storage lets us leverage EventBridge to build a robust, event-driven pipeline. EventBridge is a serverless solution that provides core components for developers to build event-driven architectures, while AWS automatically manages concerns such as error handling, retries, and scaling.

For our primary event - file uploads - EventBridge triggers an ECS Task using our ingestion task definition and passes it the document ID.

We also configured a dead-letter queue (DLQ) using Simple Queue Service (SQS) to handle event errors. These errors could be due to failed event delivery attempts (infrastructure failures) or to failed ECS task execution events (application failures). A Lambda function processes the DLQ and updates document statuses to "failed" so no failures go unnoticed.

## Ingestion Task

The Ingestion Task runs as an ECS task rather than a long-running service-we discuss this decision below in Engineering Challenges.

The ingestion task receives the ID of an uploaded document from EventBridge, which it uses to fetch the file from S3. Docling parses the document and chunks it with HybridChunker. Chunks are embedded by calling Bedrock's Titan Text Embeddings V2 model.

Once the finalized vector embeddings are written to the Aurora Serverless vector store, the ingestion task updates the document's status in DynamoDB to finished.

## Vector Store

Burrow uses Aurora Serverless PostgreSQL with the pgvector extension as its vector store.

We configured three indices:

- **Hierarchical Navigable Small World (HNSW)**, a specialized data structure used to efficiently calculate vector similarity with an approximate nearest neighbors (ANN) algorithm
- **Generalized Inverted Index (GIN)**, an index optimized for efficient keyword and term-based search
- **B-tree index** for metadata filtering

Together, these enable vector, keyword, and hybrid search in addition to metadata filtering.

## RAG API

The RAG API is an ECS service that handles all retrieval operations - we discuss the decision to separate it from the pipeline API below in Engineering Challenges.

Requests flow through CloudFront and are authenticated with the user's RAG API token.

Bedrock provides access to three models required by our API.

- Queries are embedded with Titan Text Embeddings V2 - the same model used during ingestion - and compared with Aurora to retrieve the most relevant chunks using similarity search.

- For requests with rerank set to true, the Cohere reranking model is called to re-score retrieved chunks for relevance at the cost of additional latency.

- Requests to /query synthesize the user query, retrieved chunks, and a system prompt. The result is submitted to Amazon Titan Text to generate a response.

## Full Architecture

All five subsystems are shown in this diagram of Burrow's full architecture, illustrating the complete flow from upload to retrieval.

# Engineering Tradeoffs and Challenges

## Separating Pipeline and RAG APIs

We initially considered a single API for both document management and retrieval. This would create, however, a tight coupling between services with different characteristics: the pipeline API is write-heavy, with bursts of file uploads, while the RAG API is read-heavy, with steadier traffic of retrieval queries. They also depend on different resources: the pipeline API needs access to S3 and DynamoDB, while the RAG API needs access to Aurora and Bedrock.

We ultimately decided to split them into separate services so that each can scale independently while clearly separating concerns and resource access. The trade-off is additional infrastructure overhead, with two services to deploy, monitor, and manage instead of one. To mitigate complexity and deliver a consistent developer experience, we standardized both APIs to OpenAPI specifications and used the open-source Scalar API platform to provide unified documentation and testing tools.

## Event-Driven Tasks vs Long-Running Service

During prototyping, we initially considered a long-running ECS service that would continuously wait for new documents. This approach simplifies development, testing, and maintenance.

The problem, however, is that document ingestion follows sporadic patterns. For some organizations, the typical daily workload might be a few documents uploaded throughout the day, each taking 2 minutes for ingestion. In this example, a 24/7 service would sit idle 99% of the time.

Instead, we shifted directly to an event-driven approach: S3 uploads trigger EventBridge, launching an ECS ingestion task that terminates upon completion. This allows horizontal scaling during bursts of heavy ingestion volume, while spinning down to zero for idle periods.

The trade-off is orchestration complexity: coordinating EventBridge rules, task definitions, container builds, and service-to-service communication requires more configuration than a monolithic ingestion service. The cost-savings angle, however, made this an easy decision: we estimate a 95%+ reduction in costs with this approach compared to always-on infrastructure.

We also considered AWS Lambda as another serverless solution that is typically associated with event-driven architecture. For our use case, though, ECS tasks offer more flexibility. Lambda's 15-minute limit should be sufficient for most documents, but our ingestion task could potentially exceed that for very large files. ECS has no such limit–a characteristic that may be increasingly important if future updates incorporate heavier models or additional processing steps.

## DynamoDB Access Patterns

Our MVP implemented a DynamoDB schema with documentId as the sole primary key for our document management table. As we iterated, however, it became clear that the management UI had different access patterns: frequently filtering documents by status and sorting by creation time. These queries would require inefficient table scans as data grew.

The solution was adding a Global Secondary Index (GSI) with status as the partition key and createdAt as the sort key. This GSI lets us use Query operations that scale with the number of matching items rather than the full table, ensuring fast, predictable reads for the UI.

The trade-off is that updates need to happen in both the base table and the GSI, resulting in slower writes. This is acceptable for our use case, given that document status queries are read-heavy in nature.

## Distributed Transaction Problem

Deleting a document from the pipeline requires synchronizing state in three different storage layers: the S3 bucket, DynamoDB, and PostgreSQL. Our approach to this challenge involved exploring failure modes that could lead to inconsistent states. For example, with our initial approach, a user deletion first removes the file from S3 and shows "deleting" in the UI, but something like an Eventbridge failure could prevent downstream vector deletion from running. That leaves orphaned vectors in PostgreSQL, so users could still retrieve results from a document they thought was deleted.

We wanted the system to notify the user if a document or its associated vectors failed to delete and allow retries. To achieve this, we used S3 resource tags to trigger a deletion workflow rather than optimistically deleting files. A tag-change event is routed to start an ECS ingestion task, which deletes vectors from PostgreSQL before notifying the pipeline API of success. The document is then moved to a "deleted" folder in S3 with a 90-day lifecycle policy, and a time to live (TTL) of 90 days is added to the document in DynamoDB.

These steps facilitate data auditing, allowing engineers to keep tabs on what documents were deleted and investigate incidents where users report missing documents or unexpected search results. Failed deletions are tracked and can be retried, while successful deletions follow a clear audit trail from "deleting" to "deleted" status.

## Error Handling with DLQ + Lambda

During early testing, we noticed that some ingestion task failures left document statuses stuck in "pending" indefinitely.

We needed to catch two types of failures that our Pipeline API couldn't detect: infrastructure failures, where the task fails to start, and application failures, where the task crashes.

The solution was implementing a Dead Letter Queue with Simple Queue Service that captures:

- Failed EventBridge events
- ECS tasks that exit with non-zero codes.

A Lambda function processes the Dead Letter Queue and notifies the Pipeline API, which updates the status to "failed".

One additional obstacle was that our ALB security group only allows traffic from CloudFront and a NAT Gateway IP. For our Lambda to access the Pipeline API, it had to be deployed inside a virtual private cloud (VPC) and routed through the NAT gateway. This takes an additional 2-5 seconds, but the cold start time is acceptable for infrequent error handling.

The result is that no failures go unnoticed, and the user gets clear feedback.

## Aurora Serverless + pgvector vs Dedicated Vector Stores

We evaluated three options for vector storage:

1. Pinecone
2. Amazon OpenSearch Serverless
3. Aurora Serverless PostgreSQL with pgvector extension

Pinecone is a popular choice for dedicated vector storage with strong performance and advanced features. It is, however, a managed service. Users' data would be moved outside their AWS environments, contradicting Burrow's core value statement of data sovereignty. For these reasons, Pinecone was the first to be ruled out.

OpenSearch Serverless is an AWS offering with superior performance and scalability, offering millisecond response times even for billions of embeddings. But these characteristics come with a high minimum cost: compute units must always be active, so pricing starts at $175/month with zero activity. This price floor makes it a poor fit for Burrow's target users: small to medium-sized organizations with sporadic usage patterns, compared to larger enterprises.

We ultimately opted for PostgreSQL with pgvector using Aurora Serverless v2. The main trade-off for PostgreSQL for RAG is that, as a relational database, it is not optimized for vector search. As the number of embeddings scale into the millions, queries get slower and use more memory than OpenSearch Serverless or Pinecone.

Our research, however, found that Postgres handles 5-10 million embeddings with acceptable performance, which is sufficient for the knowledge bases of most small to medium organizations. Unlike OpenSearch, Aurora allows scaling to zero capacity units, auto-pausing all resources except storage after long periods of inactivity. Even when active, Aurora's entry point of ~$50/month is well below OpenSearch's $175 minimum, making it the clear choice for Burrow.

# Future Work

## Additional Chunking Options

Docling's HybridChunker uses a semantic chunking strategy to split text, but it is an opinionated solution that can't be configured aside from a maximum chunk size. This reflects Docling's prioritization of document layout parsing as the foundation for RAG ingestion.

With quality layout parsing as a starting point, there's an opportunity to integrate additional chunking strategies. Sliding window chunks or LLM-based chunking would give users a greater variety of options to experiment with and optimize retrieval quality for their specific use cases.

## Additional Retrieval Features

The RAG landscape moves quickly, with new techniques regularly outperforming established approaches on retrieval benchmarks.

Two examples we've seen emerge in recent research are:

- **Hypothetical Document Embeddings (HyDE)**, which uses an LLM to generate a hypothetical answer for queries before retrieval to improve semantic matching
- **Query rewriting**, which uses an LLM to rewrite user queries to better match the tone and language of candidate documents.

The containerized design of our RAG api makes it straightforward to integrate these new techniques as additional retrieval features and release updates without disrupting the rest of the pipeline.

## Enterprise-Scale Vector Storage

Aurora with pgvector serves our target users well, but certain organizations may eventually run into its practical performance limits; or they might simply want access to OpenSearch's best-in-class latency for vector search. Adding OpenSearch Serverless as an additional vector storage integration would provide a compelling option for organizations where cutting-edge RAG performance becomes a critical business function.

OpenSearch's cost calculus may also become more attractive with AWS's recent release of S3 Vectors, a new vector store that uses the durable storage that backs S3, for storing large quantities of vector embeddings at up to 90% cost reduction compared to OpenSearch storage.

The tradeoff with S3 Vectors is that it only supports basic vector search functionality and has longer query times. Amazon allows integration of these two services, however, which can result in a powerful tiered storage solution that maximizes their respective benefits. Infrequently queried data can live in S3 Vectors at lower cost while retaining access to OpenSearch's advanced search capabilities, while frequently accessed data can be stored in OpenSearch to maintain millisecond response times.

Offering this integrated solution as a storage option could make Burrow a compelling choice for cost-conscious power users.

# References

- https://hamel.dev/notes/llm/rag/p1-intro.html
- https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking
- https://research.ibm.com/blog/docling-generative-AI
- https://ragie.ai
- https://vectorized.io
- https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking
- https://www.zeroentropy.dev/articles/ultimate-guide-to-choosing-the-best-reranking-model-in-2025
- https://arxiv.org/html/2506.00054v1
- https://procycons.com/en/blogs/pdf-data-extraction-benchmark/
- https://aws.amazon.com/blogs/big-data/optimizing-vector-search-using-amazon-s3-vectors-and-amazon-opensearch-service/
- https://docs.aws.amazon.com/opensearch-service/latest/developerguide/s3-vector-opensearch-integration.html
