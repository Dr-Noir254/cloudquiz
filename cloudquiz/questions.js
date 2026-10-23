/*
 * CloudQuiz question bank — original practice questions for AZ-900 study.
 * Unofficial: not affiliated with or endorsed by Microsoft. No real exam content.
 *
 * Schema (add new questions by appending objects with this shape):
 * {
 *   id:          unique string, e.g. "cc-13"
 *   topic:       "cloud" | "architecture" | "management"
 *   difficulty:  "beginner" | "intermediate" | "advanced"
 *   question:    string
 *   options:     array of exactly 4 distinct strings
 *   answer:      index (0-3) of the single correct option
 *   explanation: why the correct answer is right
 *   whyWrong:    array of 4 strings; entry at the answer index is "" and the
 *                other three explain why that option is wrong
 *   hint:        optional nudge that does not reveal the answer
 * }
 * The quiz shuffles option order at runtime, so the answer index here is
 * only meaningful relative to this file.
 */
window.QUESTION_BANK = [
  /* ------------------------------ Cloud Concepts ------------------------------ */
  {
    id: "cc-01",
    topic: "cloud",
    difficulty: "beginner",
    question: "Which statement best describes consumption-based pricing in the cloud?",
    options: [
      "You pay a fixed annual fee regardless of how much you use",
      "You pay only for the resources you actually consume",
      "You buy all required hardware before deploying any workload",
      "You pay a flat monthly fee for each employee in your company"
    ],
    answer: 1,
    explanation: "With consumption-based pricing you are billed for the resources you use, so there is no large up-front purchase and you can stop paying when you stop using a resource.",
    whyWrong: [
      "A fixed fee that ignores usage is the opposite of paying for consumption.",
      "",
      "Buying hardware up front is capital expenditure (CapEx), typical of on-premises infrastructure.",
      "Per-user licensing exists for some products, but it is not what defines consumption-based pricing."
    ],
    hint: "Think about a utility bill, such as electricity."
  },
  {
    id: "cc-02",
    topic: "cloud",
    difficulty: "beginner",
    question: "In the shared responsibility model, which item is ALWAYS the customer's responsibility, whether the workload is on-premises, IaaS, PaaS or SaaS?",
    options: [
      "The physical hosts",
      "The physical network",
      "Information and data",
      "The physical datacenter"
    ],
    answer: 2,
    explanation: "Customers always remain responsible for their information and data (along with accounts, identities and the devices they use), no matter which service type they choose.",
    whyWrong: [
      "Physical hosts are the provider's responsibility in all cloud service types.",
      "The physical network is the provider's responsibility when you use the cloud.",
      "",
      "The physical datacenter is the cloud provider's responsibility."
    ],
    hint: "Which layer stays yours even when you rent finished software?"
  },
  {
    id: "cc-03",
    topic: "cloud",
    difficulty: "beginner",
    question: "Which characteristic describes a public cloud?",
    options: [
      "Hardware is owned and operated by the cloud provider and shared among multiple customers",
      "Your organization must purchase and maintain all servers itself",
      "Resources can only be reached from inside your company network",
      "Hardware is dedicated to a single organization and located in its own building"
    ],
    answer: 0,
    explanation: "In a public cloud the provider owns and operates the hardware and makes resources available to multiple customers (tenants), which removes the need to buy and maintain your own infrastructure.",
    whyWrong: [
      "",
      "Buying and maintaining all servers describes an on-premises or private cloud approach.",
      "Restricting access to the corporate network is not a defining trait of a public cloud.",
      "Dedicated hardware in your own facility describes a private cloud."
    ],
    hint: "Who owns the hardware, and who else uses it?"
  },
  {
    id: "cc-04",
    topic: "cloud",
    difficulty: "beginner",
    question: "A retail website automatically adds capacity during a sale and removes it when traffic falls. Which cloud benefit is this?",
    options: [
      "High availability",
      "Elasticity",
      "Geo-distribution",
      "Disaster recovery"
    ],
    answer: 1,
    explanation: "Elasticity is the ability to automatically add or remove resources as demand changes, so you pay for what the workload needs at the moment.",
    whyWrong: [
      "High availability is about keeping a service running with minimal downtime, not about matching capacity to demand.",
      "",
      "Geo-distribution places resources in multiple regions to be closer to users; it does not describe automatic scaling with demand.",
      "Disaster recovery is about restoring service after a major failure."
    ],
    hint: "The key phrase is 'automatically adds and removes'."
  },
  {
    id: "cc-05",
    topic: "cloud",
    difficulty: "beginner",
    question: "Which of the following is an example of Software as a Service (SaaS)?",
    options: [
      "Azure Virtual Machines",
      "Azure App Service",
      "Microsoft 365",
      "A physical server in your own datacenter rack"
    ],
    answer: 2,
    explanation: "Microsoft 365 is finished software that you consume over the internet; the provider manages the application, platform and infrastructure.",
    whyWrong: [
      "Azure Virtual Machines is an Infrastructure as a Service (IaaS) offering.",
      "Azure App Service is a Platform as a Service (PaaS) offering for hosting your own application code.",
      "",
      "A physical server you own is on-premises infrastructure, not a cloud service."
    ],
    hint: "Which option is a complete application you simply sign in to?"
  },
  {
    id: "cc-06",
    topic: "cloud",
    difficulty: "intermediate",
    question: "A development team wants to deploy a web application without managing servers or the operating system, while keeping control of their own application code. Which cloud service type fits best?",
    options: [
      "Infrastructure as a Service (IaaS)",
      "Platform as a Service (PaaS)",
      "Software as a Service (SaaS)",
      "Private cloud"
    ],
    answer: 1,
    explanation: "PaaS gives developers a managed platform to run their own code while the provider handles the servers, operating system and runtime.",
    whyWrong: [
      "With IaaS the customer still manages the operating system, patching and runtime.",
      "",
      "SaaS delivers finished software; the team could not deploy its own application code to it.",
      "A private cloud is a deployment model, not a service type, and does not by itself remove OS management."
    ],
    hint: "Who manages the operating system in each service type?"
  },
  {
    id: "cc-07",
    topic: "cloud",
    difficulty: "intermediate",
    question: "A company keeps regulated customer records in its own datacenter but uses Azure to handle seasonal spikes in a public website. Which cloud model is this?",
    options: [
      "Public cloud only",
      "Private cloud only",
      "Multi-tenant SaaS",
      "Hybrid cloud"
    ],
    answer: 3,
    explanation: "A hybrid cloud combines a private (often on-premises) environment with a public cloud so workloads can run where they fit best.",
    whyWrong: [
      "Public cloud only would mean no on-premises environment is used.",
      "Private cloud only would mean the seasonal spikes are not handled by public cloud resources.",
      "Multi-tenant SaaS describes a software delivery type, not a mix of environments.",
      ""
    ],
    hint: "Two different environments are working together."
  },
  {
    id: "cc-08",
    topic: "cloud",
    difficulty: "intermediate",
    question: "What financial change does a company typically experience when it moves workloads from on-premises datacenters to the public cloud?",
    options: [
      "A shift from capital expenditure (CapEx) to operational expenditure (OpEx)",
      "A shift from operational expenditure to capital expenditure",
      "A guarantee that total spending always falls",
      "The elimination of all ongoing costs"
    ],
    answer: 0,
    explanation: "On-premises infrastructure requires large up-front purchases (CapEx). Cloud services are billed as they are used, which is operational expenditure (OpEx).",
    whyWrong: [
      "",
      "This reverses the typical direction of the change.",
      "Cloud costs can be lower, but they are not guaranteed to be; poorly managed usage can cost more.",
      "Cloud services still incur ongoing charges for the resources you use."
    ],
    hint: "Up-front purchase versus pay as you go."
  },
  {
    id: "cc-09",
    topic: "cloud",
    difficulty: "intermediate",
    question: "To handle increased load, you add more identical virtual machine instances behind a load balancer. What is this called?",
    options: [
      "Scaling up (vertical scaling)",
      "Failover",
      "Scaling out (horizontal scaling)",
      "Rightsizing"
    ],
    answer: 2,
    explanation: "Scaling out, or horizontal scaling, adds more instances of a resource. Scaling up increases the size or power of a single instance.",
    whyWrong: [
      "Scaling up makes one machine larger rather than adding more machines.",
      "Failover switches to a standby resource after a failure; it does not add capacity for load.",
      "",
      "Rightsizing means adjusting a resource to better match actual need, often to save cost."
    ],
    hint: "More machines, not a bigger machine."
  },
  {
    id: "cc-10",
    topic: "cloud",
    difficulty: "intermediate",
    question: "Which cloud benefit describes a workload's ability to recover from failures and continue to function?",
    options: [
      "Predictability",
      "Reliability",
      "Manageability",
      "Elasticity"
    ],
    answer: 1,
    explanation: "Reliability is the ability of a system to recover from failures and keep working, supported in the cloud by redundancy and distribution across locations.",
    whyWrong: [
      "Predictability refers to consistent performance and costs that you can forecast.",
      "",
      "Manageability refers to how easily resources can be managed, for example through automation and templates.",
      "Elasticity concerns scaling with demand, not recovering from failures."
    ],
    hint: "The benefit is about surviving faults."
  },
  {
    id: "cc-11",
    topic: "cloud",
    difficulty: "advanced",
    question: "For an Azure virtual machine (IaaS), which task is the customer's responsibility rather than Microsoft's?",
    options: [
      "Maintaining the physical host hardware",
      "Providing physical security for the datacenter",
      "Replacing failed network cabling in the datacenter",
      "Applying updates to the guest operating system"
    ],
    answer: 3,
    explanation: "In IaaS the customer manages the guest operating system, including patching, as well as applications and data. Microsoft manages the physical infrastructure.",
    whyWrong: [
      "Physical hosts are maintained by Microsoft.",
      "Datacenter physical security is Microsoft's responsibility.",
      "Cabling and physical networking are Microsoft's responsibility.",
      ""
    ],
    hint: "Look for the item that lives inside the virtual machine."
  },
  {
    id: "cc-12",
    topic: "cloud",
    difficulty: "advanced",
    question: "Compared with IaaS, which responsibility moves to the cloud provider when a team switches to PaaS?",
    options: [
      "Writing and maintaining the application code",
      "Classifying and protecting the organization's data",
      "Operating system management and patching",
      "Managing user accounts and who has access"
    ],
    answer: 2,
    explanation: "In PaaS the provider manages the operating system and underlying platform. The customer still owns the application, the data, and its accounts and access.",
    whyWrong: [
      "In PaaS the customer still writes and maintains the application.",
      "Data remains the customer's responsibility in every service type.",
      "",
      "Managing user accounts and access remains the customer's responsibility in PaaS."
    ],
    hint: "Think about what disappears from your to-do list when you stop running the VM yourself."
  },

  /* ----------------------- Azure Architecture and Services ----------------------- */
  {
    id: "ar-01",
    topic: "architecture",
    difficulty: "beginner",
    question: "What is an Azure region?",
    options: [
      "A set of datacenters deployed within a latency-defined perimeter and connected through a dedicated low-latency network",
      "A single server rack inside a Microsoft office",
      "A billing account that groups subscriptions",
      "A virtual network that spans the whole internet"
    ],
    answer: 0,
    explanation: "An Azure region is a geographic area containing one or more datacenters networked together with low latency. You choose a region when you create most resources.",
    whyWrong: [
      "",
      "A region consists of datacenters, not a single rack, and is not located in an office.",
      "Grouping subscriptions is the role of management groups or billing structures, not regions.",
      "Virtual networks are logical networks you create inside a region; a region is not one."
    ],
    hint: "It is a geographic grouping of datacenters."
  },
  {
    id: "ar-02",
    topic: "architecture",
    difficulty: "beginner",
    question: "What is an Azure availability zone?",
    options: [
      "A discount tier for virtual machines",
      "A group of subscriptions with the same owner",
      "A physically separate location within a region with independent power, cooling and networking",
      "A tool that monitors service outages"
    ],
    answer: 2,
    explanation: "Availability zones are physically separate locations inside a region, each with independent power, cooling and networking. Spreading resources across zones protects against a datacenter-level failure.",
    whyWrong: [
      "Availability zones are about resilience, not pricing.",
      "Subscriptions are an account and billing construct and have nothing to do with zones.",
      "",
      "Outage notifications come from services such as Azure Service Health, not from zones."
    ],
    hint: "Zones live inside a region."
  },
  {
    id: "ar-03",
    topic: "architecture",
    difficulty: "beginner",
    question: "What is the purpose of an Azure resource group?",
    options: [
      "To define which users may sign in to Azure",
      "To act as a logical container that holds related Azure resources",
      "To physically isolate a customer's hardware",
      "To calculate the cost of a subscription"
    ],
    answer: 1,
    explanation: "A resource group is a logical container for resources that share a lifecycle, such as the parts of one application. You can manage, deploy and delete them together.",
    whyWrong: [
      "Sign-in and identity are handled by Microsoft Entra ID.",
      "",
      "Resource groups are logical, not physical, containers.",
      "Costs are analysed with tools such as Microsoft Cost Management; a resource group does not calculate them."
    ],
    hint: "Think of a folder for related resources."
  },
  {
    id: "ar-04",
    topic: "architecture",
    difficulty: "beginner",
    question: "Which service provides cloud-based identity and access management, including single sign-on and multifactor authentication?",
    options: [
      "Azure Policy",
      "Azure Monitor",
      "Azure Key Vault",
      "Microsoft Entra ID"
    ],
    answer: 3,
    explanation: "Microsoft Entra ID (formerly Azure Active Directory) is Microsoft's cloud-based identity and access management service, supporting single sign-on and multifactor authentication.",
    whyWrong: [
      "Azure Policy enforces rules on resources; it is not an identity service.",
      "Azure Monitor collects and analyses telemetry.",
      "Azure Key Vault stores secrets, keys and certificates; it does not manage user sign-in.",
      ""
    ],
    hint: "It used to be called Azure Active Directory."
  },
  {
    id: "ar-05",
    topic: "architecture",
    difficulty: "beginner",
    question: "Which Azure Storage service is optimized for storing massive amounts of unstructured object data such as images and videos?",
    options: [
      "Azure Blob Storage",
      "Azure Queue Storage",
      "Azure Table Storage",
      "Azure Files"
    ],
    answer: 0,
    explanation: "Azure Blob Storage is object storage designed for large amounts of unstructured data such as images, video, documents and backups.",
    whyWrong: [
      "",
      "Queue Storage is a messaging service for passing messages between application components.",
      "Table Storage is a NoSQL key-attribute store for structured, non-relational data.",
      "Azure Files provides managed file shares that use file-sharing protocols; it is not the object store designed for massive unstructured data."
    ],
    hint: "Object storage, not messaging or file shares."
  },
  {
    id: "ar-06",
    topic: "architecture",
    difficulty: "intermediate",
    question: "Which Azure construct lets you apply governance conditions across multiple subscriptions?",
    options: [
      "Resource groups",
      "Management groups",
      "Availability sets",
      "Virtual networks"
    ],
    answer: 1,
    explanation: "Management groups sit above subscriptions and let you apply access and policy conditions to many subscriptions at once.",
    whyWrong: [
      "Resource groups organize resources inside a single subscription.",
      "",
      "Availability sets distribute virtual machines across fault domains; they are not a governance scope.",
      "Virtual networks provide connectivity, not governance."
    ],
    hint: "It is the level above subscriptions in the hierarchy."
  },
  {
    id: "ar-07",
    topic: "architecture",
    difficulty: "intermediate",
    question: "A team wants code to run in response to events, such as a file being uploaded, without provisioning or managing servers. Which service fits best?",
    options: [
      "Azure Virtual Machines",
      "Azure Virtual Network",
      "Azure Blob Storage",
      "Azure Functions"
    ],
    answer: 3,
    explanation: "Azure Functions is a serverless compute service that runs your code in response to triggers such as events, timers or HTTP requests, and you do not manage the servers.",
    whyWrong: [
      "Virtual machines require you to manage the operating system and servers.",
      "A virtual network provides connectivity, not compute.",
      "Blob Storage stores data; it does not run code in response to events by itself.",
      ""
    ],
    hint: "Event-driven and serverless."
  },
  {
    id: "ar-08",
    topic: "architecture",
    difficulty: "intermediate",
    question: "Which service lets Azure resources such as virtual machines communicate securely with each other, the internet and on-premises networks?",
    options: [
      "Azure Load Balancer",
      "Azure DNS",
      "Azure Virtual Network",
      "Azure Blob Storage"
    ],
    answer: 2,
    explanation: "Azure Virtual Network is the fundamental building block for private networking in Azure, enabling resources to communicate with each other, the internet and on-premises networks.",
    whyWrong: [
      "A load balancer distributes traffic across instances; it is not the private network itself.",
      "Azure DNS hosts domain name zones and answers name queries.",
      "",
      "Blob Storage stores unstructured data."
    ],
    hint: "It is the private network you create in Azure."
  },
  {
    id: "ar-09",
    topic: "architecture",
    difficulty: "advanced",
    question: "A company needs a private, dedicated connection between its on-premises network and Azure that does not travel over the public internet. Which service should it use?",
    options: [
      "Azure DNS",
      "Azure ExpressRoute",
      "Azure Content Delivery",
      "Azure Bastion"
    ],
    answer: 1,
    explanation: "Azure ExpressRoute provides a private connection between on-premises infrastructure and Microsoft cloud services through a connectivity provider, without using the public internet. A VPN Gateway, by contrast, sends encrypted traffic over the public internet.",
    whyWrong: [
      "Azure DNS resolves domain names and does not create connectivity.",
      "",
      "A content delivery network caches content close to users; it is not a private link to your datacenter.",
      "Azure Bastion provides secure remote access to virtual machines through the portal; it does not connect whole networks."
    ],
    hint: "The key requirement is avoiding the public internet."
  },
  {
    id: "ar-10",
    topic: "architecture",
    difficulty: "advanced",
    question: "A workload needs many identical virtual machines that can automatically increase or decrease in number based on demand. Which Azure feature is designed for this?",
    options: [
      "Virtual Machine Scale Sets",
      "Azure Resource Locks",
      "Azure Blueprints",
      "Management groups"
    ],
    answer: 0,
    explanation: "Virtual Machine Scale Sets let you create and manage a group of load-balanced, identical VMs whose count can automatically grow or shrink with demand.",
    whyWrong: [
      "",
      "Resource locks prevent accidental deletion or modification; they do not scale anything.",
      "Blueprints and similar governance tools define repeatable environments, not autoscaling VM groups.",
      "Management groups organize subscriptions for governance and do not manage VM counts."
    ],
    hint: "Identical instances and automatic scale-out."
  },
  {
    id: "ar-11",
    topic: "architecture",
    difficulty: "advanced",
    question: "Which service is the deployment and management layer through which Azure portal, CLI and template requests are processed?",
    options: [
      "Azure Advisor",
      "Azure Monitor",
      "Microsoft Defender for Cloud",
      "Azure Resource Manager"
    ],
    answer: 3,
    explanation: "Azure Resource Manager is the deployment and management service for Azure. Requests from the portal, command-line tools and templates all pass through it, which applies consistent management and access control.",
    whyWrong: [
      "Azure Advisor gives recommendations; it does not process deployment requests.",
      "Azure Monitor collects telemetry and does not deploy resources.",
      "Defender for Cloud focuses on security posture and threat protection.",
      ""
    ],
    hint: "All management tools talk to the same layer."
  },
  {
    id: "ar-12",
    topic: "architecture",
    difficulty: "advanced",
    question: "You want a virtual machine workload to keep running if one datacenter in the region fails, while keeping all resources in the same region. What should you do?",
    options: [
      "Deploy the VMs in a single availability zone and use premium SSD disks",
      "Deploy the VMs across multiple availability zones in the same region",
      "Place all the VMs in one resource group",
      "Apply a CanNotDelete lock to the VMs"
    ],
    answer: 1,
    explanation: "Availability zones are physically separate locations within a region. Spreading VMs across zones keeps the workload running if one zone has a problem.",
    whyWrong: [
      "Premium disks improve performance but do not protect against the failure of the single zone the VMs run in.",
      "",
      "A resource group is a logical container and gives no protection against datacenter failure.",
      "A lock prevents accidental deletion; it does not provide resilience against outages."
    ],
    hint: "Which option spreads resources over physically separate locations?"
  },

  /* ------------------------ Azure Management and Governance ------------------------ */
  {
    id: "mg-01",
    topic: "management",
    difficulty: "beginner",
    question: "Which tool lets you estimate the cost of Azure services before you deploy them?",
    options: [
      "Azure pricing calculator",
      "Azure Service Health",
      "Azure Policy",
      "Azure Cloud Shell"
    ],
    answer: 0,
    explanation: "The Azure pricing calculator lets you configure services and estimate expected costs before deploying.",
    whyWrong: [
      "",
      "Service Health reports on Azure service issues and planned maintenance, not on cost estimates.",
      "Azure Policy enforces rules on resources.",
      "Cloud Shell is a browser-based command-line environment."
    ],
    hint: "You use it before spending anything."
  },
  {
    id: "mg-02",
    topic: "management",
    difficulty: "beginner",
    question: "Which service lets you analyse spending, create budgets and set alerts to help control cloud costs?",
    options: [
      "Azure Service Health",
      "Azure Policy",
      "Microsoft Cost Management",
      "Azure Arc"
    ],
    answer: 2,
    explanation: "Microsoft Cost Management helps you monitor, allocate and optimize cloud spending, including setting budgets and alerts.",
    whyWrong: [
      "Service Health informs you about service incidents affecting your resources.",
      "Azure Policy governs resource configuration; it does not track spending.",
      "",
      "Azure Arc extends Azure management to resources outside Azure."
    ],
    hint: "The name contains the word you are looking for."
  },
  {
    id: "mg-03",
    topic: "management",
    difficulty: "beginner",
    question: "Which service would you use to make sure resources can only be deployed in approved Azure regions?",
    options: [
      "Azure Monitor",
      "Azure Policy",
      "Microsoft Entra ID",
      "Azure Advisor"
    ],
    answer: 1,
    explanation: "Azure Policy lets you create and assign rules, such as an allowed-locations rule, and evaluates resources for compliance with them.",
    whyWrong: [
      "Azure Monitor observes performance and health; it does not enforce deployment rules.",
      "",
      "Microsoft Entra ID manages identities and sign-in rather than resource rules.",
      "Advisor gives recommendations but does not enforce where resources are deployed."
    ],
    hint: "You need to enforce a rule, not just observe."
  },
  {
    id: "mg-04",
    topic: "management",
    difficulty: "beginner",
    question: "Which service provides security posture management and threat protection for workloads in Azure and other environments?",
    options: [
      "Azure Pricing Calculator",
      "Azure Resource Locks",
      "Azure Service Health",
      "Microsoft Defender for Cloud"
    ],
    answer: 3,
    explanation: "Microsoft Defender for Cloud assesses and improves your security posture and helps protect workloads from threats.",
    whyWrong: [
      "The pricing calculator estimates cost.",
      "Locks prevent accidental changes but do not assess security posture.",
      "Service Health reports on Azure service issues, not security posture.",
      ""
    ],
    hint: "The name mentions defending."
  },
  {
    id: "mg-05",
    topic: "management",
    difficulty: "intermediate",
    question: "You want to stop anyone, including users with owner permissions, from accidentally deleting a critical production resource. What should you apply?",
    options: [
      "A resource lock with the CanNotDelete setting",
      "A cost budget with an alert",
      "A tag with the value 'production'",
      "A new resource group"
    ],
    answer: 0,
    explanation: "A CanNotDelete lock prevents the resource from being deleted until the lock is removed. A ReadOnly lock additionally prevents modifications.",
    whyWrong: [
      "",
      "A budget sends alerts about cost and does not block deletion.",
      "Tags are labels for organization and reporting; they do not protect a resource.",
      "A resource group is a container and does not stop deletion by itself."
    ],
    hint: "You need something that blocks an action."
  },
  {
    id: "mg-06",
    topic: "management",
    difficulty: "intermediate",
    question: "Your finance team wants to group Azure costs by department across many resource groups. Which feature helps most?",
    options: [
      "Availability zones",
      "Resource locks",
      "Tags",
      "Virtual networks"
    ],
    answer: 2,
    explanation: "Tags are name-value pairs you attach to resources, for example Department=Finance, so you can organize resources and filter or group cost reports across resource groups.",
    whyWrong: [
      "Availability zones are about resilience, not cost reporting.",
      "Locks prevent changes and do not label resources.",
      "",
      "Virtual networks provide connectivity."
    ],
    hint: "Think of labels you attach to resources."
  },
  {
    id: "mg-07",
    topic: "management",
    difficulty: "intermediate",
    question: "Which service collects, analyses and acts on telemetry such as metrics and logs from your Azure resources?",
    options: [
      "Azure Policy",
      "Azure Monitor",
      "Azure Resource Manager",
      "Azure pricing calculator"
    ],
    answer: 1,
    explanation: "Azure Monitor collects and analyses telemetry from Azure and other environments and can raise alerts and trigger actions.",
    whyWrong: [
      "Azure Policy evaluates resources against rules and does not collect telemetry.",
      "",
      "Resource Manager is the deployment and management layer.",
      "The pricing calculator estimates costs."
    ],
    hint: "Metrics and logs."
  },
  {
    id: "mg-08",
    topic: "management",
    difficulty: "intermediate",
    question: "Which service analyses your resource configuration and usage and provides personalized recommendations to improve reliability, security, performance and cost?",
    options: [
      "Azure Monitor",
      "Azure Policy",
      "Azure Cloud Shell",
      "Azure Advisor"
    ],
    answer: 3,
    explanation: "Azure Advisor reviews your deployed resources and gives personalized best-practice recommendations.",
    whyWrong: [
      "Azure Monitor collects telemetry and alerts; it is not the recommendation engine.",
      "Policy enforces rules rather than recommending improvements.",
      "Cloud Shell is a command-line environment.",
      ""
    ],
    hint: "Think of a consultant that reviews what you have built."
  },
  {
    id: "mg-09",
    topic: "management",
    difficulty: "intermediate",
    question: "Which service gives you personalized notifications about Azure service issues and planned maintenance that affect your resources?",
    options: [
      "Azure Service Health",
      "Azure Cost Management",
      "Azure Policy",
      "Microsoft Purview"
    ],
    answer: 0,
    explanation: "Azure Service Health provides personalized alerts and guidance when Azure service issues or planned maintenance affect the resources you use.",
    whyWrong: [
      "",
      "Cost Management analyses spending.",
      "Azure Policy enforces rules on resources.",
      "Microsoft Purview focuses on data governance and compliance."
    ],
    hint: "It tells you when the platform itself has a problem."
  },
  {
    id: "mg-10",
    topic: "management",
    difficulty: "advanced",
    question: "A company runs servers in its own datacenter and in another cloud and wants to manage them with Azure tools such as Azure Policy. Which service enables this?",
    options: [
      "Azure Advisor",
      "Azure Service Health",
      "Azure Arc",
      "Azure Blob Storage"
    ],
    answer: 2,
    explanation: "Azure Arc extends Azure management and governance to resources running outside Azure, such as on-premises or in other clouds.",
    whyWrong: [
      "Advisor provides recommendations for resources in Azure and does not extend management to other environments.",
      "Service Health reports on Azure service issues.",
      "",
      "Blob Storage is a data storage service."
    ],
    hint: "It extends Azure management beyond Azure."
  },
  {
    id: "mg-11",
    topic: "management",
    difficulty: "advanced",
    question: "An administrator wants to run Azure CLI or Azure PowerShell commands from a browser without installing anything locally. What should they use?",
    options: [
      "Azure Arc",
      "Azure Cloud Shell",
      "Azure Advisor",
      "Azure Service Health"
    ],
    answer: 1,
    explanation: "Azure Cloud Shell is an authenticated, browser-accessible shell that supports both Azure CLI and Azure PowerShell without local installation.",
    whyWrong: [
      "Azure Arc extends management to non-Azure resources; it is not a shell.",
      "",
      "Advisor gives recommendations and has no command-line environment.",
      "Service Health provides notifications about service issues."
    ],
    hint: "The name says what it is."
  },
  {
    id: "mg-12",
    topic: "management",
    difficulty: "advanced",
    question: "Which statement correctly distinguishes Azure Policy from Azure role-based access control (Azure RBAC)?",
    options: [
      "Azure Policy assigns users to roles, while Azure RBAC evaluates resource properties",
      "Azure Policy and Azure RBAC are two names for the same feature",
      "Azure RBAC enforces allowed regions, while Azure Policy manages user sign-in",
      "Azure Policy enforces rules on resource configuration, while Azure RBAC controls which actions users may perform"
    ],
    answer: 3,
    explanation: "Azure Policy focuses on resource properties and compliance, such as allowed locations. Azure RBAC controls what actions specific users, groups or applications can perform at a given scope.",
    whyWrong: [
      "This swaps the two services' roles.",
      "They are separate features with different purposes.",
      "This also swaps the roles; sign-in is handled by Microsoft Entra ID and allowed regions are a policy matter.",
      ""
    ],
    hint: "One is about 'what resources look like', the other about 'who can do what'."
  }
];
